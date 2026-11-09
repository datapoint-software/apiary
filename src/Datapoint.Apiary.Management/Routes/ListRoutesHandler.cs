using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class ListRoutesHandler(IClusterState cluster, IRouteTelemetry telemetry) : IQueryHandler<ListRoutes, IReadOnlyList<RouteView>>
{
    public async ValueTask<IReadOnlyList<RouteView>> HandleAsync(ListRoutes query, CancellationToken cancellationToken = default)
    {
        var measured = await telemetry.ReadAsync(cancellationToken);
        return [.. cluster.Current.Routes.Values
            .Where(r => query.ProjectId is null || r.ProjectId == query.ProjectId)
            .OrderBy(r => r.Host, StringComparer.Ordinal)
            .ThenBy(r => r.Path, StringComparer.Ordinal)
            .Select(r => RouteView.From(r, measured.GetValueOrDefault(r.Id, RouteTelemetry.Unknown)))];
    }
}
