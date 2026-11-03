using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Agents;

public sealed record AgentSaved(Agent Agent) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Agents = state.Agents.SetItem(Agent.Id, Agent) };
}
