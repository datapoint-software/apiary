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
        proxy.Use((context, next) =>
        {
            if (context.Request.IsHttps && ProxyRoutes.Find(context, cluster.Current) is { StrictTransport: true } route)
            {
                var value = route.StrictTransportSubdomains ? "max-age=31536000; includeSubDomains" : "max-age=31536000";
                context.Response.OnStarting(() =>
                {
                    context.Response.Headers.StrictTransportSecurity = value;
                    return Task.CompletedTask;
                });
            }

            return next(context);
        });
        proxy.UseOutputCache();
        proxy.UseMiddleware<CanarySelector>();
        return proxy;
    }
}
