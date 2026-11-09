using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class SetLanguageHandler(StateTransaction transaction, CurrentUser current) : ICommandHandler<SetLanguage>
{
    public ValueTask HandleAsync(SetLanguage command, CancellationToken cancellationToken = default)
    {
        var user = current.Require(transaction.State);
        transaction.Record(new UserSaved(user with { Language = command.Language }));
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
