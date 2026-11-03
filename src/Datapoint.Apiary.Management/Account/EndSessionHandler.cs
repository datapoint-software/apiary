using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class EndSessionHandler(StateTransaction transaction, CurrentUser current) : ICommandHandler<EndSession>
{
    public ValueTask HandleAsync(EndSession command, CancellationToken ct = default)
    {
        if (!transaction.State.Sessions.TryGetValue(command.Id, out var session) || session.UserId != current.UserId)
        {
            throw ActionFailedException.NotFound(ErrorCodes.SessionNotFound);
        }

        transaction.Record(new SessionsEnded([session.Id]));
        return ValueTask.CompletedTask;
    }
}
