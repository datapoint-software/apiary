using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class GetSessionPolicyHandler(IClusterState cluster) : IQueryHandler<GetSessionPolicy, SessionPolicyView>
{
    public ValueTask<SessionPolicyView> HandleAsync(GetSessionPolicy query, CancellationToken cancellationToken = default) =>
        new(new SessionPolicyView((int)SessionPolicy.IdleTimeout(cluster.Current).TotalMinutes));
}
