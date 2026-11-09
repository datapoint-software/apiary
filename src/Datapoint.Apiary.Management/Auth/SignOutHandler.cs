using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Auth;

public sealed class SignOutHandler(StateTransaction transaction, CurrentUser current, ISessionCookie cookie) : ICommandHandler<SignOut>
{
    public ValueTask HandleAsync(SignOut command, CancellationToken cancellationToken = default)
    {
        cookie.Clear();
        if (current.SessionId is { } id && transaction.State.Sessions.ContainsKey(id))
        {
            transaction.Record(new SessionsEnded([id]));
        }

        return ValueTask.CompletedTask;
    }
}
