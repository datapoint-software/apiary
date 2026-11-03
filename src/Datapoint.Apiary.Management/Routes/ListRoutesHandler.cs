using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class ListRoutesHandler(IClusterState cluster) : IQueryHandler<ListRoutes, IReadOnlyList<RouteView>>
{
    public ValueTask<IReadOnlyList<RouteView>> HandleAsync(ListRoutes query, CancellationToken ct = default)
    {
        IReadOnlyList<RouteView> routes = [.. cluster.Current.Routes.Values
            .Where(r => query.ProjectId is null || r.ProjectId == query.ProjectId)
            .OrderBy(r => r.Host, StringComparer.Ordinal)
            .ThenBy(r => r.Path, StringComparer.Ordinal)
            .Select(RouteView.From)];
        return new(routes);
    }
}
