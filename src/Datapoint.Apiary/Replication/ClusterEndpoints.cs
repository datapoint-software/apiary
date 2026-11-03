using System.Security.Claims;
using System.Text.Json;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Proxy.Telemetry;
using Datapoint.Apiary.Telemetry;
using Datapoint.Mediator;
using DotNext.Net.Cluster.Consensus.Raft;

namespace Datapoint.Apiary.Replication;

public static class ClusterEndpoints
{
    public static RouteGroupBuilder MapApiaryCluster(this RouteGroupBuilder group)
    {
        group.MapPost("/join", JoinAsync);
        var replicas = group.MapGroup("").AddEndpointFilter(RequireReplicaAsync);
        replicas.MapPost("/announce", (ReplicaAnnouncement announcement, RaftClusterState cluster, CancellationToken ct) =>
            Membership(() => cluster.AdmitAsync(announcement, ct)));
        replicas.MapPost("/leave", (ReplicaAnnouncement announcement, RaftClusterState cluster, CancellationToken ct) =>
            Membership(() => cluster.ReleaseAsync(announcement, ct)));
        replicas.MapPost("/entries", AppendAsync);
        replicas.MapPost("/" + CommandForwarder.Path, CommandAsync);
        replicas.MapGet("/keys", (HttpContext http, RaftClusterState cluster) =>
            cluster.KeysFor(http.Connection.ClientCertificate) is { } ring ? Results.Json(ring, ClusterWireJsonContext.Default.SharedKeyRing) : Results.StatusCode(StatusCodes.Status403Forbidden));
        replicas.MapGet("/view", (RaftClusterState cluster) => Results.Json(cluster.Describe(), ClusterWireJsonContext.Default.ClusterView));
        replicas.MapGet("/" + ClusterRouteTelemetry.Path, (RouteTelemetrySource source) => Results.Json(source.Snapshot(), ApiJson.Options));
        replicas.MapGet("/" + ClusterActivityTelemetry.Path, (long until, int points, int step, ProxyMetrics metrics) =>
            points is > 0 and <= ActivityHistory.Minutes && step > 0 && (long)points * step <= ActivityHistory.Minutes
                ? Results.Json(metrics.Activity.Read(until, points, step), ApiJson.Options)
                : Results.BadRequest());
        replicas.MapGet("/challenges/{token}", (string token, RaftClusterState cluster) =>
            cluster.Current.AcmeChallenges.TryGetValue(token, out var challenge) ? Results.Json(challenge, ClusterWireJsonContext.Default.AcmeChallenge) : Results.NotFound());
        return group;
    }

    private static async Task<IResult> JoinAsync(HttpContext context, RaftClusterState cluster)
    {
        var request = await context.Request.ReadFromJsonAsync(ClusterWireJsonContext.Default.JoinRequest, context.RequestAborted);
        return request is not null && cluster.AnswerJoin(request, context.Connection.RemoteIpAddress) is { } response
            ? Results.Json(response, ClusterWireJsonContext.Default.JoinResponse)
            : Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    private static async ValueTask<object?> RequireReplicaAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var cluster = http.RequestServices.GetRequiredService<RaftClusterState>();
        return cluster.Credentials?.IsTrusted(http.Connection.ClientCertificate) is true
            ? await next(context)
            : Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    private static async Task<IResult> Membership(Func<Task<bool>> change)
    {
        try
        {
            return await change() ? Results.Ok() : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
        catch (Exception exception) when (exception is NotLeaderException or QuorumUnreachableException or ClusterUnavailableException or HttpRequestException)
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    }

    private static async Task<IResult> AppendAsync(HttpContext context, RaftClusterState cluster)
    {
        if (!cluster.IsLeader)
        {
            return Results.StatusCode(StatusCodes.Status421MisdirectedRequest);
        }

        var entry = await context.Request.ReadFromJsonAsync(ClusterJsonContext.Default.StateEntry, context.RequestAborted);
        if (entry is null)
        {
            return Results.BadRequest();
        }

        if (!cluster.Current.AppliedRequests.ContainsKey(entry.RequestId))
        {
            await cluster.AppendLocalAsync(entry, context.RequestAborted);
        }

        return Results.Ok();
    }

    private static async Task<IResult> CommandAsync(
        HttpContext context,
        RaftClusterState cluster,
        IActionDispatcher dispatcher,
        ForwardedRequest forwarded,
        TimeProvider time)
    {
        if (!cluster.IsLeader)
        {
            return Results.StatusCode(StatusCodes.Status421MisdirectedRequest);
        }

        var command = await context.Request.ReadFromJsonAsync<ForwardedCommand>(ForwardingJson.Options, context.RequestAborted);
        if (command is null)
        {
            return Results.BadRequest();
        }

        if (cluster.Current.AppliedRequests.TryGetValue(command.RequestId, out var applied))
        {
            return Results.Json(new ForwardedResult(applied.Result is { } stored ? JsonDocument.Parse(stored).RootElement : null, null, cluster.Current.Index), ForwardingJson.Options);
        }

        var recorder = new CookieRecorder();
        context.User = Principal(command, cluster.Current, time.GetUtcNow());
        context.Features.Set(new ForwardedOrigin(command.Address, command.Client, command.Device));
        context.Features.Set(recorder);
        forwarded.RequestId = command.RequestId;
        try
        {
            var result = await dispatcher.DispatchAsync(command.Action, command.Arguments, ApiJson.Options, context.RequestAborted);
            var json = result is null ? (JsonElement?)null : JsonSerializer.SerializeToElement(result, result.GetType(), ForwardingJson.Options);
            return Results.Json(new ForwardedResult(json, recorder.Cookie, cluster.Current.Index), ForwardingJson.Options);
        }
        catch (Exception exception) when (ApiErrors.Map(exception) is { } problem)
        {
            return problem;
        }
    }

    private static ClaimsPrincipal Principal(ForwardedCommand command, ApiaryState state, DateTimeOffset now)
    {
        var session = command.Claims.FirstOrDefault(c => c.Type == ApiaryClaims.SessionId)?.Value;
        var agent = command.Claims.FirstOrDefault(c => c.Type == ApiaryClaims.AgentId)?.Value;
        var principal = (session, agent) switch
        {
            ({ } sessionId, _) => Guid.TryParse(sessionId, out var id)
                ? SessionPrincipals.Create(state, state.Sessions.GetValueOrDefault(id), now, command.AuthenticationType ?? AuthenticationSchemes.Session)
                : null,
            (_, { } agentId) => Guid.TryParse(agentId, out var id)
                ? AgentPrincipals.Create(state, state.Agents.GetValueOrDefault(id), now, command.AuthenticationType ?? AuthenticationSchemes.Agent)
                : null,
            _ => CommandForwarder.Principal(command),
        };
        return principal ?? new ClaimsPrincipal(new ClaimsIdentity());
    }
}
