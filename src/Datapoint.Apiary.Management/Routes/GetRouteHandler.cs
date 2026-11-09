using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class GetRouteHandler(IClusterState cluster, IRouteTelemetry telemetry) : IQueryHandler<GetRoute, RouteView>
{
    public async ValueTask<RouteView> HandleAsync(GetRoute query, CancellationToken cancellationToken = default)
    {
        if (!cluster.Current.Routes.TryGetValue(query.Id, out var route))
        {
            throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
        }

        var measured = await telemetry.ReadAsync(cancellationToken);
        return RouteView.From(route, measured.GetValueOrDefault(route.Id, RouteTelemetry.Unknown));
    }
}
