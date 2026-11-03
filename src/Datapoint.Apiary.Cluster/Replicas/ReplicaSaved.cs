using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ReplicaSaved(Replica Replica) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Replicas = state.Replicas.SetItem(Replica.Id, Replica), ApprovedReplicas = state.ApprovedReplicas.Remove(Replica.Id) };
}
