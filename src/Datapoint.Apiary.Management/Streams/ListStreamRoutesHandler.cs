using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

public sealed class ListStreamRoutesHandler(IClusterState cluster, IRouteTelemetry telemetry)
    : IQueryHandler<ListStreamRoutes, IReadOnlyList<StreamRouteView>>
{
    public async ValueTask<IReadOnlyList<StreamRouteView>> HandleAsync(ListStreamRoutes query, CancellationToken ct = default)
    {
        var readings = await telemetry.ReadAsync(ct);
        return [.. cluster.Current.StreamRoutes.Values
            .Where(s => query.ProjectId is null || s.ProjectId == query.ProjectId)
            .OrderBy(s => s.ListenPort)
            .ThenBy(s => s.Protocol)
            .ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
            .Select(s => StreamRouteView.Of(s, readings.TryGetValue(s.Id, out var reading) ? reading.Connections : 0))];
    }
}
