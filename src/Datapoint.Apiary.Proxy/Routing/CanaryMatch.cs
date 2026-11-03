using Datapoint.Apiary.Cluster.Routes;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Routing;

public static class CanaryMatch
{
    public static bool Matches(RouteCanary? canary, HttpRequest request) => canary switch
    {
        { Source: CanarySource.Header } => string.Equals(request.Headers[canary.Name].ToString(), canary.Value, StringComparison.Ordinal),
        { Source: CanarySource.Cookie } => request.Cookies.TryGetValue(canary.Name, out var value) && string.Equals(value, canary.Value, StringComparison.Ordinal),
        _ => false,
    };
}
