using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Health;
using Datapoint.Apiary.Proxy.AccessLogs;
using Datapoint.Apiary.Proxy.Pages;
using Datapoint.Apiary.Proxy.Redirects;
using Datapoint.Apiary.Proxy.Routing;
using Datapoint.Apiary.Recovery;
using Datapoint.Apiary.Replication;
using Datapoint.Apiary.Telemetry;

namespace Datapoint.Apiary.Hosting;

public static class ApiaryPipeline
{
    public static WebApplication UseApiary(this WebApplication app)
    {
        app.Services.StartApiaryMeters();
        app.UseExceptionHandler(handler => handler.Run(context =>
            ApiErrors.Internal(context).ToResult().ExecuteAsync(context)));
        app.UseWhen(c => !Listener.IsCluster(c), serving => serving.UseReadinessGate(app.Services.GetRequiredService<RaftClusterState>()));
        app.UseWhen(Listener.IsAdmin, admin => admin.UseAdminSecurityHeaders().UseDefaultFiles().UseStaticFiles().UseFetchSiteGuard().UseAuthentication());
        app.UseWhen(Listener.IsPublic, proxy => proxy.UseMiddleware<AccessLogMiddleware>().UseMiddleware<PublicHttpsMiddleware>().UseMiddleware<RedirectMiddleware>());
        app.UseRouting();
        var admin = app.MapGroup("").WithMetadata(ListenerMetadata.Admin);
        admin.MapApiaryMetrics(app.Configuration.GetSection("Apiary:Telemetry"));
        MapAdmin(admin);
        app.MapGroup("/cluster").WithMetadata(ListenerMetadata.Cluster).MapApiaryCluster();
        app.MapReverseProxy(proxy =>
        {
            proxy.UseMiddleware<RouteGate>();
            proxy.UseSessionAffinity();
            proxy.UseLoadBalancing();
            proxy.UsePassiveHealthChecks();
        }).WithMetadata(ListenerMetadata.Public);
        app.MapFallback(PublicPages.NotFound).WithMetadata(ListenerMetadata.Public);
        return app;
    }

    private static void MapAdmin(RouteGroupBuilder admin)
    {
        admin.MapApiaryHealth();
        admin.MapGroup("/operator").MapApiaryOperator();
        admin.MapOpenApi();
        admin.MapApiaryOAuth();
        admin.MapActions("/api", o =>
        {
            o.SerializerOptions = ApiJson.Options;
            o.MapException = ApiErrors.Map;
        });
        admin.MapFallback("/api/{**rest}", () => new ApiProblem(StatusCodes.Status404NotFound, "request.notFound").ToResult());
        admin.MapFallbackToFile("index.html");
    }
}
