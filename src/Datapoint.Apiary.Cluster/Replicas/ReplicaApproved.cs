using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ReplicaApproved(Guid Id) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { ApprovedReplicas = state.ApprovedReplicas.Add(Id) };
}
