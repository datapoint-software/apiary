using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Proxy.Pages;

namespace Datapoint.Apiary.Hosting;

public static class ReadinessGate
{
    private static readonly PathString s_api = "/api";

    public static IApplicationBuilder UseReadinessGate(this IApplicationBuilder app, RaftClusterState cluster) =>
        app.Use((context, next) =>
        {
            if (cluster.IsReady)
            {
                return next(context);
            }

            context.Response.Headers.RetryAfter = "10";
            var result = Listener.IsPublic(context)
                ? PublicPages.Starting()
                : context.Request.Path.StartsWithSegments(s_api)
                    ? new ApiProblem(StatusCodes.Status503ServiceUnavailable, ErrorCodes.NotReady).ToResult()
                    : null;
            return result?.ExecuteAsync(context) ?? next(context);
        });
}
