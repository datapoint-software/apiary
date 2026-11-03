using System.Diagnostics;
using Datapoint.Apiary.Proxy.Routing;
using Datapoint.Apiary.Proxy.Telemetry;
using Microsoft.AspNetCore.Http;
using Yarp.ReverseProxy.Model;

namespace Datapoint.Apiary.Proxy.AccessLogs;

public sealed class AccessLogMiddleware(RequestDelegate next, AccessLogWriter writer, ProxyMetrics metrics, TimeProvider time)
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
            var elapsed = Stopwatch.GetElapsedTime(started);
            var route = context.Features.Get<IReverseProxyFeature>()?.Route.Config.Metadata?.GetValueOrDefault(ProxyConfigBuilder.RouteIdMetadata);
            if (route is not null)
            {
                metrics.Record(route, context.Request.Host.Host, context.Response.StatusCode, elapsed);
            }

            writer.Write(Describe(context, route, elapsed));
        }
    }

    private AccessLogEntry Describe(HttpContext context, string? route, TimeSpan elapsed)
    {
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
            route,
            context.Features.Get<IReverseProxyFeature>()?.ProxiedDestination?.Model.Config.Address,
            request.Headers.UserAgent.ToString() is { Length: > 0 } agent ? agent : null);
    }
}
