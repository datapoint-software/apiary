using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Routing;
using Yarp.ReverseProxy;
using Yarp.ReverseProxy.Model;

namespace Datapoint.Apiary.Proxy.Telemetry;

public sealed class RouteTelemetrySource(IClusterState cluster, IProxyStateLookup proxy, ProxyMetrics metrics)
{
    public IReadOnlyList<RouteSnapshot> Snapshot()
    {
        var routes = cluster.Current.Routes.Values;
        var snapshots = new List<RouteSnapshot>();
        var keep = new HashSet<string>(StringComparer.Ordinal);
        foreach (var route in routes)
        {
            var id = route.Id.ToString();
            keep.Add(id);
            snapshots.Add(new RouteSnapshot(route.Id, metrics.PerMinute(id), Targets(ProxyConfigBuilder.ClusterId(route))));
        }

        metrics.Forget(keep);
        return snapshots;
    }

    private List<TargetSnapshot> Targets(string clusterId)
    {
        if (!proxy.TryGetCluster(clusterId, out var state))
        {
            return [];
        }

        return [.. state.Destinations.Values.Select(d => new TargetSnapshot(d.Model.Config.Address, Health(d)))];
    }

    private static TargetHealth Health(DestinationState destination) => destination.Health.Active switch
    {
        DestinationHealth.Healthy => TargetHealth.Healthy,
        DestinationHealth.Unhealthy => TargetHealth.Unhealthy,
        _ => TargetHealth.Unknown,
    };
}
