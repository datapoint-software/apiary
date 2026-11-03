using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class GetRouteHandler(IClusterState cluster) : IQueryHandler<GetRoute, RouteView>
{
    public ValueTask<RouteView> HandleAsync(GetRoute query, CancellationToken ct = default) =>
        cluster.Current.Routes.TryGetValue(query.Id, out var route)
            ? new(RouteView.From(route))
            : throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
}
