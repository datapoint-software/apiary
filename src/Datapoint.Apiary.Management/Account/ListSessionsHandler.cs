using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

public sealed class ListSessionsHandler(IClusterState cluster, CurrentUser current, TimeProvider time)
    : IQueryHandler<ListSessions, IReadOnlyList<SessionView>>
{
    public ValueTask<IReadOnlyList<SessionView>> HandleAsync(ListSessions query, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        return new([.. cluster.Current.Sessions.Values
            .Where(s => s.UserId == current.UserId && s.ExpiresAt > now)
            .OrderByDescending(s => s.Id == current.SessionId)
            .ThenByDescending(s => s.StartedAt)
            .Select(s => new SessionView(s.Id, s.Device, s.Address, s.StartedAt, s.ExpiresAt, s.Id == current.SessionId))]);
    }
}
