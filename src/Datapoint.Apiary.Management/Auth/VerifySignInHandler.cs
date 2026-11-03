using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Auth;

public sealed class VerifySignInHandler(
    StateTransaction transaction,
    Challenges challenges,
    Sessions sessions,
    SignInThrottle throttle,
    AuditLog audit,
    IRequestOrigin origin,
    TimeProvider time) : ICommandHandler<VerifySignIn, SignInResult>
{
    public async ValueTask<SignInResult> HandleAsync(VerifySignIn command, CancellationToken ct = default)
    {
        var challenge = challenges.Read(command.Challenge, ChallengePurpose.SignIn, ChallengePurpose.Enroll);
        if (challenge.UserId is not { } userId
            || !transaction.State.Users.TryGetValue(userId, out var user)
            || user.Status is not UserStatus.Active)
        {
            throw ActionFailedException.Invalid(ErrorCodes.ChallengeExpired);
        }

        var key = string.Concat(user.Id.ToString(), "|", origin.Address);
        throttle.EnsureAllowed(key);
        var now = time.GetUtcNow();
        var recoveryCodes = challenge.Purpose is ChallengePurpose.Enroll ? RecoveryCodes.New() : null;
        var twoStep = Check(user, challenge, command.Code, now, recoveryCodes);
        if (twoStep is null)
        {
            if (throttle.Failed(key) == SignInThrottle.AuditedFailures)
            {
                await audit.RecordAsync("auth.verify", AuditOutcome.Failed, user.Email, [user.Id.ToString()], ct);
            }

            throw FieldErrors.For(nameof(VerifySignIn.Code), ErrorCodes.CodeInvalid);
        }

        throttle.Succeeded(key);
        var updated = user with { TwoStep = twoStep };
        transaction.Record(new UserSaved(updated));
        sessions.Start(updated);
        return new SignInResult(recoveryCodes);
    }

    private static TwoStepSetup? Check(User user, Challenge challenge, string code, DateTimeOffset now, IReadOnlyList<string>? recoveryCodes) =>
        challenge.Purpose is ChallengePurpose.Enroll
            ? user.TwoStep is null && challenge.Secret is { } secret ? TwoStepCodes.Enroll(secret, code, now, recoveryCodes!) : null
            : user.TwoStep is { } setup ? TwoStepCodes.Use(setup, code, now) : null;
}
