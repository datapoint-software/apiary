using System.Globalization;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;

namespace Datapoint.Apiary.Proxy.Routing;

public static class ProxyConfigBuilder
{
    public const string RouteIdMetadata = "apiary.route";

    public static IReadOnlyList<RouteConfig> BuildRoutes(ApiaryState state)
    {
        var routes = new List<RouteConfig>(state.Routes.Count);
        foreach (var route in state.Routes.Values)
        {
            routes.Add(BuildRoute(route));
        }

        return routes;
    }

    public static IReadOnlyList<ClusterConfig> BuildClusters(ApiaryState state)
    {
        var clusters = new List<ClusterConfig>(state.Routes.Count);
        foreach (var route in state.Routes.Values)
        {
            clusters.Add(BuildCluster(route));
        }

        return clusters;
    }

    private static RouteConfig BuildRoute(Route route) => new()
    {
        RouteId = ClusterId(route),
        ClusterId = ClusterId(route),
        Order = -route.Path.Length,
        Match = new RouteMatch
        {
            Hosts = [route.Host],
            Path = route.Path == "/" ? "/{**rest}" : route.Path + "/{**rest}",
        },
        Metadata = new Dictionary<string, string>(StringComparer.Ordinal) { [RouteIdMetadata] = route.Id.ToString() },
    };

    private static ClusterConfig BuildCluster(Route route) => new()
    {
        ClusterId = ClusterId(route),
        LoadBalancingPolicy = "PowerOfTwoChoices",
        HttpRequest = new ForwarderRequestConfig { ActivityTimeout = TimeSpan.FromSeconds(route.TimeoutSeconds) },
        Destinations = route.Targets
            .Select((target, index) => (Key: index.ToString(CultureInfo.InvariantCulture), Target: target))
            .ToDictionary(d => d.Key, d => new DestinationConfig { Address = Address(d.Target) }, StringComparer.Ordinal),
    };

    private static string ClusterId(Route route) => route.Id.ToString("N");

    private static string Address(RouteTarget target)
    {
        var host = target.Host.Contains(':', StringComparison.Ordinal) && !target.Host.StartsWith('[') ? $"[{target.Host}]" : target.Host;
        return string.Create(CultureInfo.InvariantCulture, $"http://{host}:{target.Port}");
    }
}
