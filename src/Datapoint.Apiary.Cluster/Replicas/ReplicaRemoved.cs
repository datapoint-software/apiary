using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ReplicaRemoved(Guid Id, DateTimeOffset? At = null) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with
    {
        Replicas = state.Replicas.Remove(Id),
        RemovedReplicas = At is { } at
            ? state.RemovedReplicas.RemoveRange(state.RemovedReplicas.Where(r => r.Value < at - ClusterAuthority.ReplicaLifetime).Select(r => r.Key)).SetItem(Id, at)
            : state.RemovedReplicas,
    };
}
