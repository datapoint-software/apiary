using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Replication;

public sealed class CommandForwarder(
    RaftClusterState cluster,
    ClusterClient client,
    IPrincipalAccessor principals,
    IRequestOrigin origin,
    ForwardedRequest forwarded,
    ISessionCookie cookie,
    TimeProvider time) : ICommandForwarder
{
    public const string Path = "commands";
    private static readonly TimeSpan s_deadline = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan s_requestTimeout = TimeSpan.FromMinutes(4);
    private static readonly TimeSpan s_retry = TimeSpan.FromSeconds(1);

    public async ValueTask ForwardAsync(ICommand command, CancellationToken cancellationToken) =>
        await SendAsync(command, cancellationToken);

    public async ValueTask<TResult> ForwardAsync<TResult>(ICommand<TResult> command, CancellationToken cancellationToken)
    {
        var result = await SendAsync(command, cancellationToken);
        return result is { } json ? json.Deserialize<TResult>(ApiJson.Options)! : default!;
    }

    public string? Serialize<TResult>(TResult result) => JsonSerializer.Serialize(result, ApiJson.Options);

    private async Task<JsonElement?> SendAsync(object command, CancellationToken cancellationToken)
    {
        var message = Describe(command);
        var deadline = time.GetUtcNow() + s_deadline;
        while (time.GetUtcNow() < deadline)
        {
            if (cluster.LeaderAddress is { } leader && !cluster.IsLeader
                && await TrySendAsync(leader, message, cancellationToken) is { } answer)
            {
                ApplyCookie(answer.Cookie);
                return answer.Result;
            }

            await Task.Delay(s_retry, time, cancellationToken);
        }

        throw new ActionFailedException(ErrorCodes.NoQuorum, FailureKind.Unavailable);
    }

    private async Task<ForwardedResult?> TrySendAsync(IPAddress leader, ForwardedCommand message, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await client.SendAsync(leader, Path, JsonContent.Create(message, options: ApiJson.Options), cancellationToken, s_requestTimeout);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<ForwardedResult>(ApiJson.Options, cancellationToken);
            }

            if (response.StatusCode is HttpStatusCode.ServiceUnavailable or HttpStatusCode.MisdirectedRequest)
            {
                return null;
            }

            throw new ForwardedProblemException((int)response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private ForwardedCommand Describe(object command)
    {
        var principal = principals.Principal;
        forwarded.RequestId ??= Guid.CreateVersion7(time.GetUtcNow());
        return new ForwardedCommand(
            forwarded.RequestId.Value,
            StateTransactionBehavior.ActionName(command.GetType()),
            JsonSerializer.SerializeToElement(command, command.GetType(), ApiJson.Options),
            principal?.Identity?.AuthenticationType,
            [.. principal?.Claims.Select(c => new ForwardedClaim(c.Type, c.Value)) ?? []],
            origin.Address,
            origin.Client,
            origin.Device);
    }

    private void ApplyCookie(ForwardedCookie? forwardedCookie)
    {
        if (forwardedCookie is null)
        {
            return;
        }

        if (forwardedCookie.Token is { } token)
        {
            cookie.Issue(token);
        }
        else
        {
            cookie.Clear();
        }
    }

    public static ClaimsPrincipal Principal(ForwardedCommand command) =>
        new(new ClaimsIdentity(command.Claims.Select(c => new Claim(c.Type, c.Value)), command.AuthenticationType));
}
