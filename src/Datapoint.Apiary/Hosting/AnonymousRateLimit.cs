using System.Globalization;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Proxy.RateLimits;

namespace Datapoint.Apiary.Hosting;

public static class AnonymousRateLimit
{
    public static IApplicationBuilder UseAnonymousRateLimit(this IApplicationBuilder app, ClientRateLimiter limiter, ApiaryOptions options) =>
        app.Use((context, next) =>
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                return next(context);
            }

            var reading = HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method);
            var (scope, perMinute) = reading ? ("admin-reads", options.AnonymousReadsPerMinute) : ("admin-writes", options.AnonymousWritesPerMinute);
            if (limiter.TryAcquire(scope, context.Connection.RemoteIpAddress, perMinute, out var retryAfter))
            {
                return next(context);
            }

            var seconds = (long)Math.Ceiling(retryAfter.TotalSeconds);
            context.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
            return new ApiProblem(StatusCodes.Status429TooManyRequests, ErrorCodes.TooManyRequests, Params: new Dictionary<string, object?>(StringComparer.Ordinal) { ["retryAfter"] = seconds })
                .ToResult().ExecuteAsync(context);
        });
}
