using System.Globalization;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Pages;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class RouteGate(RequestDelegate next, IClusterState cluster, AddressAllowlists allowlists, TimeProvider time)
{
    public Task InvokeAsync(HttpContext context)
    {
        var metadata = context.GetReverseProxyFeature().Route.Config.Metadata;
        if (metadata is null || !metadata.TryGetValue(ProxyConfigBuilder.RouteIdMetadata, out var value)
            || !Guid.TryParse(value, out var id) || !cluster.Current.Routes.TryGetValue(id, out var route))
        {
            return next(context);
        }

        if (!allowlists.Allows(route, context.Connection.RemoteIpAddress))
        {
            return PublicPages.Forbidden().ExecuteAsync(context);
        }

        if (route.Disabled)
        {
            return PublicPages.Disabled().ExecuteAsync(context);
        }

        var now = time.GetUtcNow();
        if (route.Maintenance is { } window && window.IsActive(now))
        {
            context.Response.Headers.RetryAfter = ((long)Math.Ceiling((window.End - now).TotalSeconds)).ToString(CultureInfo.InvariantCulture);
            return PublicPages.Maintenance(window.Message, window.End).ExecuteAsync(context);
        }

        return next(context);
    }
}
