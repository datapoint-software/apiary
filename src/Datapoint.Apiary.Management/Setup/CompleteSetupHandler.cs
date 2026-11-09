using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Setup;

public sealed class CompleteSetupHandler(
    StateTransaction transaction,
    SetupWindow window,
    Challenges challenges,
    Sessions sessions,
    TimeProvider time) : ICommandHandler<CompleteSetup, IReadOnlyList<string>>
{
    public ValueTask<IReadOnlyList<string>> HandleAsync(CompleteSetup command, CancellationToken cancellationToken = default)
    {
        if (!window.IsOpen(transaction.State))
        {
            throw ActionFailedException.Forbidden(ErrorCodes.SetupClosed);
        }

        var email = Emails.Normalize(command.Email);
        var challenge = challenges.Read(command.Challenge, ChallengePurpose.Setup);
        if (challenge.Email != email || challenge.Secret is null)
        {
            throw ActionFailedException.Invalid(ErrorCodes.ChallengeExpired);
        }

        var now = time.GetUtcNow();
        var recoveryCodes = RecoveryCodes.New();
        var twoStep = TwoStepCodes.Enroll(challenge.Secret, command.Code, now, recoveryCodes)
            ?? throw FieldErrors.For(nameof(CompleteSetup.Code), ErrorCodes.CodeInvalid);
        var user = new User(
            Guid.CreateVersion7(now), command.Name.Trim(), email, Role.Administrator, UserStatus.Active,
            PasswordHasher.Hash(command.Password), twoStep, Invite: null, now, LastSignInAt: null);
        transaction.Record(new UserSaved(user));
        transaction.Record(new SetupCompleted());
        sessions.Start(user);
        return new(recoveryCodes);
    }
}
