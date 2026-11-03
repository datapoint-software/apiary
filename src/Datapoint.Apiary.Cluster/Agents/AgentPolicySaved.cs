using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Agents;

public sealed record AgentPolicySaved(AgentPolicy Policy) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { AgentPolicy = Policy };
}
