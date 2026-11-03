using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class ListAgentsHandler(IClusterState cluster, CurrentUser current, TimeProvider time)
    : IQueryHandler<ListAgents, IReadOnlyList<AgentView>>
{
    public ValueTask<IReadOnlyList<AgentView>> HandleAsync(ListAgents query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var user = current.Require(state);
        var now = time.GetUtcNow();
        return new([.. state.Agents.Values
            .Where(a => AgentState.IsConnected(a, now) && (a.UserId == user.Id || user.Role is Role.Administrator))
            .OrderByDescending(a => a.UserId == user.Id)
            .ThenByDescending(a => a.LastUsedAt)
            .Select(a => new AgentView(a.Id, a.Name, state.Users.GetValueOrDefault(a.UserId)?.Email, a.ConnectedAt, a.LastUsedAt, a.UserId == user.Id))]);
    }
}
