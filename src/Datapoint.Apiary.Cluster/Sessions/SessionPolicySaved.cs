using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Sessions;

public sealed record SessionPolicySaved(SessionPolicy Policy) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { SessionPolicy = Policy };
}
