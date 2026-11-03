using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class NewRecoveryCodesHandler(StateTransaction transaction, CurrentUser current)
    : ICommandHandler<NewRecoveryCodes, IReadOnlyList<string>>
{
    public ValueTask<IReadOnlyList<string>> HandleAsync(NewRecoveryCodes command, CancellationToken ct = default)
    {
        var user = current.Require(transaction.State);
        var twoStep = user.TwoStep ?? throw ActionFailedException.Conflict(ErrorCodes.Invalid);
        var codes = RecoveryCodes.New();
        transaction.Record(new UserSaved(user with { TwoStep = twoStep with { RecoveryCodeHashes = [.. codes.Select(RecoveryCodes.Hash)] } }));
        transaction.Affects(user.Id);
        return new(codes);
    }
}
