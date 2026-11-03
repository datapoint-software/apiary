using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Trust;

public sealed record ClusterCaAdded(ClusterCa Next, DateTimeOffset At) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state.NextClusterCa is null ? state with { NextClusterCa = Next, ClusterCaChangedAt = At } : state;
}
