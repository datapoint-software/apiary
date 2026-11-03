using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ReplicaLeft(Guid Id) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Replicas = state.Replicas.Remove(Id), ApprovedReplicas = state.ApprovedReplicas.Add(Id) };
}
