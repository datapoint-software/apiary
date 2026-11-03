using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Trust;

public sealed record ClusterCaRetired(DateTimeOffset At) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { RetiringClusterCa = null, ClusterCaChangedAt = At };
}
