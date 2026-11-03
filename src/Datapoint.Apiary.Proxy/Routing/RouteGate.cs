using System.Globalization;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Pages;
using Datapoint.Apiary.Proxy.RateLimits;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class RouteGate(RequestDelegate next, IClusterState cluster, AddressAllowlists allowlists, ClientRateLimiter limiter, TimeProvider time)
{
    public Task InvokeAsync(HttpContext context)
    {
        if (ProxyRoutes.Find(context, cluster.Current) is not { } route)
        {
            return next(context);
        }

        if (!allowlists.Allows(route.AllowedAddresses, context.Connection.RemoteIpAddress))
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

        if (route.RateLimit is { } perMinute && !limiter.TryAcquire(route.Id.ToString(), context.Connection.RemoteIpAddress, perMinute, out var retryAfter))
        {
            context.Response.Headers.RetryAfter = ((long)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
            return PublicPages.TooManyRequests().ExecuteAsync(context);
        }

        return next(context);
    }
}
