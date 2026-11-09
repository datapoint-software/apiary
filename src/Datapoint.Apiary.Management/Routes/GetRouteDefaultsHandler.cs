using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class GetRouteDefaultsHandler(IClusterState cluster) : IQueryHandler<GetRouteDefaults, RouteDefaultsView>
{
    public ValueTask<RouteDefaultsView> HandleAsync(GetRouteDefaults query, CancellationToken cancellationToken = default) =>
        new(new RouteDefaultsView(RouteDefaults.RequestMegabytesOf(cluster.Current)));
}
