using Microsoft.AspNetCore.Builder;

namespace Datapoint.Apiary.Proxy.Routing;

public static class RouteFeatures
{
    public static IApplicationBuilder UseApiaryRouteFeatures(this IApplicationBuilder proxy)
    {
        proxy.UseMiddleware<RouteGate>();
        proxy.UseMiddleware<CanarySelector>();
        return proxy;
    }
}
