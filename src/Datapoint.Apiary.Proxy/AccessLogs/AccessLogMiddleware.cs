using System.Diagnostics;
using Datapoint.Apiary.Proxy.Routing;
using Microsoft.AspNetCore.Http;
using Yarp.ReverseProxy.Model;

namespace Datapoint.Apiary.Proxy.AccessLogs;

public sealed class AccessLogMiddleware(RequestDelegate next, AccessLogWriter writer, TimeProvider time)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var started = Stopwatch.GetTimestamp();
        try
        {
            await next(context);
        }
        finally
        {
            writer.Write(Describe(context, Stopwatch.GetElapsedTime(started)));
        }
    }

    private AccessLogEntry Describe(HttpContext context, TimeSpan elapsed)
    {
        var proxy = context.Features.Get<IReverseProxyFeature>();
        var request = context.Request;
        return new AccessLogEntry(
            time.GetUtcNow(),
            context.Connection.RemoteIpAddress?.ToString(),
            request.Method,
            request.Host.Host,
            request.Path.Value ?? "/",
            context.Response.StatusCode,
            context.Response.ContentLength,
            Math.Round(elapsed.TotalMilliseconds, 2),
            proxy?.Route.Config.Metadata?.GetValueOrDefault(ProxyConfigBuilder.RouteIdMetadata),
            proxy?.ProxiedDestination?.Model.Config.Address,
            request.Headers.UserAgent.ToString() is { Length: > 0 } agent ? agent : null);
    }
}
