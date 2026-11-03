using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ClusterCreated(Guid ClusterId, ClusterCa Ca) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state.ClusterId is null ? state with { ClusterId = ClusterId, ClusterCa = Ca } : state;
}
