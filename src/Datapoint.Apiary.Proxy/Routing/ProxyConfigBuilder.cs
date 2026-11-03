using System.Globalization;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Caching;
using Datapoint.Apiary.Proxy.Health;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;

namespace Datapoint.Apiary.Proxy.Routing;

public static class ProxyConfigBuilder
{
    public const string RouteIdMetadata = "apiary.route";
    private static readonly TimeSpan s_probeInterval = TimeSpan.FromSeconds(15);
    public const string AffinityCookie = "apiary_affinity";
    private static readonly TimeSpan s_probeTimeout = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan s_affinityLifetime = TimeSpan.FromHours(1);

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
        OutputCachePolicy = route.Caching ? HttpCachePolicy.PolicyName : null,
    };

    private static ClusterConfig BuildCluster(Route route) => new()
    {
        ClusterId = ClusterId(route),
        LoadBalancingPolicy = route.Targets.Count > 1 ? WeightedPolicy.PolicyName : "PowerOfTwoChoices",
        SessionAffinity = route.Sticky ? Affinity : null,
        HealthCheck = new HealthCheckConfig
        {
            AvailableDestinationsPolicy = "HealthyOrPanic",
            Active = new ActiveHealthCheckConfig
            {
                Enabled = true,
                Interval = s_probeInterval,
                Timeout = s_probeTimeout,
                Policy = ReachablePolicy.PolicyName,
                Path = "/",
            },
        },
        HttpRequest = new ForwarderRequestConfig { ActivityTimeout = TimeSpan.FromSeconds(route.TimeoutSeconds) },
        Destinations = route.Targets
            .Select((target, index) => (Key: index.ToString(CultureInfo.InvariantCulture), Target: target))
            .ToDictionary(d => d.Key, d => Destination(d.Target), StringComparer.Ordinal),
    };

    private static SessionAffinityConfig Affinity { get; } = new()
    {
        Enabled = true,
        Policy = "HashCookie",
        FailurePolicy = "Redistribute",
        AffinityKeyName = AffinityCookie,
        Cookie = new SessionAffinityCookieConfig
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax,
            SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest,
            Expiration = s_affinityLifetime,
        },
    };

    private static DestinationConfig Destination(RouteTarget target) => new()
    {
        Address = Address(target),
        Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [WeightedPolicy.WeightMetadata] = target.Weight.ToString(CultureInfo.InvariantCulture),
        },
    };

    public static string ClusterId(Route route) => route.Id.ToString("N");

    private static string Address(RouteTarget target)
    {
        var host = target.Host.Contains(':', StringComparison.Ordinal) && !target.Host.StartsWith('[') ? $"[{target.Host}]" : target.Host;
        return string.Create(CultureInfo.InvariantCulture, $"http://{host}:{target.Port}");
    }
}
