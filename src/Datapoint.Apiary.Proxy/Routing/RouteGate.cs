using System.Globalization;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Proxy.Pages;
using Datapoint.Apiary.Proxy.Passwords;
using Datapoint.Apiary.Proxy.RateLimits;
using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class RouteGate(RequestDelegate next, IClusterState cluster, AddressAllowlists allowlists, ClientRateLimiter limiter, PasswordGate passwords, PublicPages pages, TimeProvider time)
{
    public Task InvokeAsync(HttpContext context)
    {
        if (ProxyRoutes.Find(context, cluster.Current) is not { } route)
        {
            return next(context);
        }

        if (!allowlists.Allows(route.AllowedAddresses, context.Connection.RemoteIpAddress))
        {
            return pages.Forbidden().ExecuteAsync(context);
        }

        if (route.Disabled)
        {
            return pages.Disabled().ExecuteAsync(context);
        }

        var now = time.GetUtcNow();
        if (route.Maintenance is { } window && window.IsActive(now))
        {
            context.Response.Headers.RetryAfter = ((long)Math.Ceiling((window.End - now).TotalSeconds)).ToString(CultureInfo.InvariantCulture);
            return pages.Maintenance(route, window).ExecuteAsync(context);
        }

        if (route.RateLimit is { } perMinute && !limiter.TryAcquire(route.Id.ToString(), context.Connection.RemoteIpAddress, perMinute, out var retryAfter))
        {
            context.Response.Headers.RetryAfter = ((long)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
            return pages.TooManyRequests().ExecuteAsync(context);
        }

        if (route.Password is { } password)
        {
            return passwords.InvokeAsync(context, route, password, next);
        }

        return next(context);
    }
}
