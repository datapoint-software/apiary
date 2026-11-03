using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Proxy.Telemetry;

namespace Datapoint.Apiary.Telemetry;

public static class RouteTelemetryMerger
{
    public static IReadOnlyDictionary<Guid, RouteTelemetry> Merge(IEnumerable<IReadOnlyList<RouteSnapshot>> replicas)
    {
        var routes = replicas.SelectMany(snapshots => snapshots).GroupBy(s => s.RouteId);
        return routes.ToDictionary(g => g.Key, g => Combine([.. g]));
    }

    private static RouteTelemetry Combine(IReadOnlyList<RouteSnapshot> reports)
    {
        var targets = reports
            .SelectMany(r => r.Targets)
            .GroupBy(t => t.Address, StringComparer.OrdinalIgnoreCase)
            .Select(g => Judge([.. g.Select(t => t.Health)]))
            .ToList();
        var down = targets.Count(h => h == TargetHealth.Unhealthy);
        var up = targets.Count(h => h == TargetHealth.Healthy);
        return new RouteTelemetry(reports.Sum(r => r.RequestsPerMinute), Health(up, down), down)
        {
            Connections = reports.Sum(r => r.Connections),
            LastConnectionAt = reports.Max(r => r.LastConnectionAt),
        };
    }

    private static TargetHealth Judge(IReadOnlyList<TargetHealth> views)
    {
        if (views.Contains(TargetHealth.Healthy))
        {
            return TargetHealth.Healthy;
        }

        return views.Contains(TargetHealth.Unhealthy) ? TargetHealth.Unhealthy : TargetHealth.Unknown;
    }

    private static RouteHealth Health(int up, int down)
    {
        if (down == 0)
        {
            return up == 0 ? RouteHealth.Unknown : RouteHealth.Healthy;
        }

        return up == 0 ? RouteHealth.Down : RouteHealth.Degraded;
    }
}
