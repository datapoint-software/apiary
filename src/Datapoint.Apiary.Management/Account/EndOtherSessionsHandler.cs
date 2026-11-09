using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class EndOtherSessionsHandler(StateTransaction transaction, CurrentUser current, Sessions sessions) : ICommandHandler<EndOtherSessions>
{
    public ValueTask HandleAsync(EndOtherSessions command, CancellationToken cancellationToken = default)
    {
        var user = current.Require(transaction.State);
        sessions.EndAll(user.Id, except: current.SessionId);
        return ValueTask.CompletedTask;
    }
}
