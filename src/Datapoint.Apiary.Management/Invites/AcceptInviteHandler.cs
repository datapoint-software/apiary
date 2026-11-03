using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Invites;

public sealed class AcceptInviteHandler(StateTransaction transaction, Challenges challenges, Sessions sessions, TimeProvider time)
    : ICommandHandler<AcceptInvite, IReadOnlyList<string>>
{
    public ValueTask<IReadOnlyList<string>> HandleAsync(AcceptInvite command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        var user = InviteTokens.Find(transaction.State, command.Token, now);
        var challenge = challenges.Read(command.Challenge, ChallengePurpose.Invite);
        if (challenge.UserId != user.Id || challenge.Secret is null)
        {
            throw ActionFailedException.Invalid(ErrorCodes.ChallengeExpired);
        }

        if (PasswordPolicy.Check(command.Password, user.Email) is PasswordProblem.ContainsEmail)
        {
            throw FieldErrors.For(nameof(AcceptInvite.Password), ErrorCodes.PasswordContainsEmail);
        }

        var recoveryCodes = RecoveryCodes.New();
        var twoStep = TwoStepCodes.Enroll(challenge.Secret, command.Code, now, recoveryCodes)
            ?? throw FieldErrors.For(nameof(AcceptInvite.Code), ErrorCodes.CodeInvalid);
        var active = user with
        {
            Status = UserStatus.Active,
            PasswordHash = PasswordHasher.Hash(command.Password),
            TwoStep = twoStep,
            Invite = null,
        };
        transaction.Record(new UserSaved(active));
        sessions.Start(active);
        return new(recoveryCodes);
    }
}
