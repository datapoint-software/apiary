using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Trust;

public sealed record ClusterCaPromoted(DateTimeOffset At) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state.NextClusterCa is { } next
        ? state with { RetiringClusterCa = state.ClusterCa, ClusterCa = next, NextClusterCa = null, ClusterCaChangedAt = At }
        : state;
}
