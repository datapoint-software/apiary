using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Agents;

public sealed record AgentsRemoved(IReadOnlyList<Guid> AgentIds) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Agents = state.Agents.RemoveRange(AgentIds) };
}
