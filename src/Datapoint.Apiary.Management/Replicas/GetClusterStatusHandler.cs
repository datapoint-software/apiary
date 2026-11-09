using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

public sealed class GetClusterStatusHandler(RaftClusterState cluster) : IQueryHandler<GetClusterStatus, ClusterView>
{
    public async ValueTask<ClusterView> HandleAsync(GetClusterStatus query, CancellationToken cancellationToken = default) => await cluster.DescribeAsync(cancellationToken);
}
