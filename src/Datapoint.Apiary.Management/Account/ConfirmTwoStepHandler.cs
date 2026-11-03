using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class ConfirmTwoStepHandler(StateTransaction transaction, CurrentUser current, Challenges challenges, PasswordConfirmation password, TimeProvider time)
    : ICommandHandler<ConfirmTwoStep>
{
    public ValueTask HandleAsync(ConfirmTwoStep command, CancellationToken ct = default)
    {
        var user = current.Require(transaction.State);
        var challenge = challenges.Read(command.Challenge, ChallengePurpose.Reenroll);
        if (challenge.UserId != user.Id || challenge.Secret is null)
        {
            throw ActionFailedException.Invalid(ErrorCodes.ChallengeExpired);
        }

        password.Require(user, command.Password, nameof(ConfirmTwoStep.Password));

        var twoStep = TwoStepCodes.Enroll(challenge.Secret, command.Code, time.GetUtcNow(), [])
            ?? throw FieldErrors.For(nameof(ConfirmTwoStep.Code), ErrorCodes.CodeInvalid);
        var codes = user.TwoStep?.RecoveryCodeHashes ?? [];
        transaction.Record(new UserSaved(user with { TwoStep = twoStep with { RecoveryCodeHashes = codes } }));
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
