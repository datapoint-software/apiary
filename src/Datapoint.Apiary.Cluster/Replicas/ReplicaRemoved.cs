using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ReplicaRemoved(Guid Id) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Replicas = state.Replicas.Remove(Id) };
}
