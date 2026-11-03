using System.Collections.Concurrent;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Recovery;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.TwoStep;

namespace Datapoint.Apiary.Recovery;

public static class RecoveryEndpoints
{
    private static readonly ConcurrentDictionary<Guid, long> s_usedSteps = new();

    public static RouteGroupBuilder MapApiaryRecovery(this RouteGroupBuilder api)
    {
        var recovery = api.MapGroup("/cluster").AddEndpointFilter(RequireAdministratorAsync);
        recovery.MapPost("/recovery-plan", async (RaftClusterState cluster, CancellationToken ct) =>
            Results.Json(await cluster.PlanRecoveryAsync(ct), ApiJson.Options));
        recovery.MapPost("/recover", RecoverAsync);
        return api;
    }

    private static async Task<IResult> RecoverAsync(
        RecoverCluster request,
        HttpContext context,
        RaftClusterState cluster,
        SignInThrottle throttle,
        IRequestOrigin origin,
        TimeProvider time,
        CancellationToken ct)
    {
        var user = Administrator(context, cluster);
        if (user is not { PasswordHash: not null, TwoStep: { } twoStep })
        {
            return new ApiProblem(StatusCodes.Status403Forbidden, ErrorCodes.Forbidden).ToResult();
        }

        var key = string.Concat("recover|", user.Id.ToString(), "|", origin.Address);
        try
        {
            throttle.EnsureAllowed(key);
        }
        catch (ActionFailedException throttled)
        {
            return ApiErrors.Map(throttled)!;
        }

        if (!PasswordHasher.Verify(request.Password ?? "", user.PasswordHash))
        {
            throttle.Failed(key);
            return Invalid(nameof(RecoverCluster.Password), ErrorCodes.PasswordIncorrect);
        }

        var lastUsed = Math.Max(twoStep.LastUsedStep, s_usedSteps.GetValueOrDefault(user.Id));
        if (Totp.Verify(twoStep.Secret, request.Code ?? "", time.GetUtcNow(), lastUsed) is not { } step
            || !ClaimStep(user.Id, step))
        {
            throttle.Failed(key);
            return Invalid(nameof(RecoverCluster.Code), ErrorCodes.CodeInvalid);
        }

        throttle.Succeeded(key);
        try
        {
            await cluster.RequestRecoveryAsync(request.Node ?? "", user.Email, origin.Address, ct);
            return Results.Accepted();
        }
        catch (RecoveryRefusedException refused)
        {
            return new ApiProblem(StatusCodes.Status409Conflict, refused.Code).ToResult();
        }
    }

    private static bool ClaimStep(Guid userId, long step)
    {
        while (true)
        {
            if (!s_usedSteps.TryGetValue(userId, out var used))
            {
                if (s_usedSteps.TryAdd(userId, step))
                {
                    return true;
                }
            }
            else if (used >= step)
            {
                return false;
            }
            else if (s_usedSteps.TryUpdate(userId, step, used))
            {
                return true;
            }
        }
    }

    private static User? Administrator(HttpContext context, RaftClusterState cluster) =>
        Guid.TryParse(context.User.FindFirst(ApiaryClaims.UserId)?.Value, out var id)
        && cluster.Current.Users.TryGetValue(id, out var user)
        && user is { Status: UserStatus.Active, Role: Role.Administrator }
            ? user
            : null;

    private static IResult Invalid(string field, string code) =>
        new ApiProblem(
            StatusCodes.Status400BadRequest,
            ValidationProblems.ValidationFailed,
            [new FieldError(char.ToLowerInvariant(field[0]) + field[1..], code, null)]).ToResult();

    private static async ValueTask<object?> RequireAdministratorAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var principal = context.HttpContext.User;
        if (principal.Identity?.AuthenticationType != AuthenticationSchemes.Session)
        {
            return new ApiProblem(StatusCodes.Status401Unauthorized, ErrorCodes.AuthenticationRequired).ToResult();
        }

        return principal.IsInRole(nameof(Role.Administrator))
            ? await next(context)
            : new ApiProblem(StatusCodes.Status403Forbidden, ErrorCodes.Forbidden).ToResult();
    }
}
