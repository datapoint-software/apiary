using Datapoint.Apiary.Cluster.Raft;

namespace Datapoint.Apiary.Health;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapApiaryHealth(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/health/live", () => Results.Ok());
        endpoints.MapGet("/health/ready", (IHostApplicationLifetime lifetime, RaftClusterState cluster) =>
            lifetime.ApplicationStarted.IsCancellationRequested && cluster.IsReady ? Results.Ok() : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
        return endpoints;
    }
}
