using Datapoint.Apiary.Cluster.State;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Proxy.Routing;

public static class RouteFeatures
{
    public static IApplicationBuilder UseApiaryRouteFeatures(this IApplicationBuilder proxy)
    {
        var cluster = proxy.ApplicationServices.GetRequiredService<IClusterState>();
        proxy.UseMiddleware<RouteGate>();
        proxy.UseWhen(context => ProxyRoutes.Find(context, cluster.Current) is { Compression: true }, compressed => compressed.UseResponseCompression());
        proxy.UseOutputCache();
        proxy.UseMiddleware<CanarySelector>();
        return proxy;
    }
}
