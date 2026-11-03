using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Recovery;
using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Recovery;

public static class OperatorEndpoints
{
    public static RouteGroupBuilder MapApiaryOperator(this RouteGroupBuilder group)
    {
        var recovery = group.MapGroup("/recovery").AddEndpointFilter(RequireLocalOperatorAsync);
        recovery.MapPost("/plan", async (RaftClusterState cluster, CancellationToken ct) =>
            Results.Json(await cluster.PlanRecoveryAsync(ct), ApiJson.Options));
        recovery.MapPost("/start", async (RaftClusterState cluster, CancellationToken ct) =>
        {
            try
            {
                await cluster.RequestRecoveryAsync(ct);
                return Results.Accepted();
            }
            catch (RecoveryRefusedException refused)
            {
                return new ApiProblem(StatusCodes.Status409Conflict, refused.Code).ToResult();
            }
        });
        return group;
    }

    private static async ValueTask<object?> RequireLocalOperatorAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next) =>
        context.HttpContext.User.HasClaim(c => c.Type == ApiaryClaims.Local)
            ? await next(context)
            : new ApiProblem(StatusCodes.Status403Forbidden, "auth.forbidden").ToResult();
}
