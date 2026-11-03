using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Replication;

public sealed partial class CommandForwarder(
    RaftClusterState cluster,
    ClusterClient client,
    IPrincipalAccessor principals,
    IRequestOrigin origin,
    ForwardedRequest forwarded,
    ISessionCookie cookie,
    TimeProvider time,
    ILogger<CommandForwarder> logger) : ICommandForwarder
{
    public const string Path = "commands";
    private static readonly TimeSpan s_deadline = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan s_requestTimeout = TimeSpan.FromMinutes(4);
    private static readonly TimeSpan s_retry = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan s_leaderless = TimeSpan.FromSeconds(3);
    private static readonly TimeSpan s_leaderCheck = TimeSpan.FromMilliseconds(250);

    public async ValueTask ForwardAsync(ICommand command, CancellationToken cancellationToken) =>
        await SendAsync(command, cancellationToken);

    public async ValueTask<TResult> ForwardAsync<TResult>(ICommand<TResult> command, CancellationToken cancellationToken)
    {
        var result = await SendAsync(command, cancellationToken);
        return result is { } json ? json.Deserialize<TResult>(ForwardingJson.Options)! : default!;
    }

    public string? Serialize<TResult>(TResult result) => JsonSerializer.Serialize(result, ForwardingJson.Options);

    private async Task<JsonElement?> SendAsync(object command, CancellationToken cancellationToken)
    {
        var message = Describe(command);
        var deadline = time.GetUtcNow() + s_deadline;
        var leaderSeen = time.GetUtcNow();
        while (time.GetUtcNow() < deadline && time.GetUtcNow() - leaderSeen < s_leaderless)
        {
            if (cluster.LeaderAddress is not { } leader)
            {
                await Task.Delay(s_leaderCheck, time, cancellationToken);
                continue;
            }

            if (await TrySendAsync(leader, message, cancellationToken) is { } answer)
            {
                ApplyCookie(answer.Cookie);
                await cluster.WaitForAsync(state => state.Index >= answer.Index, cancellationToken);
                return answer.Result;
            }

            leaderSeen = time.GetUtcNow();
            await Task.Delay(s_retry, time, cancellationToken);
        }

        throw new ActionFailedException(ErrorCodes.NoQuorum, FailureKind.Unavailable);
    }

    private async Task<ForwardedResult?> TrySendAsync(IPAddress leader, ForwardedCommand message, CancellationToken cancellationToken)
    {
        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var watching = CancelOnLeaderChangeAsync(leader, attempt);
        try
        {
            using var response = await client.SendAsync(leader, Path, JsonContent.Create(message, options: ForwardingJson.Options), attempt.Token, s_requestTimeout);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<ForwardedResult>(ForwardingJson.Options, attempt.Token);
            }

            if (response.StatusCode is HttpStatusCode.ServiceUnavailable or HttpStatusCode.MisdirectedRequest)
            {
                LogRefused(leader, response.StatusCode);
                return null;
            }

            throw new ForwardedProblemException((int)response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
        }
        catch (HttpRequestException exception)
        {
            LogRetrying(leader, exception.Message);
            return null;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            LogRetrying(leader, "the leader changed");
            return null;
        }
        finally
        {
            await attempt.CancelAsync();
            await watching;
        }
    }

    private async Task CancelOnLeaderChangeAsync(IPAddress leader, CancellationTokenSource attempt)
    {
        try
        {
            while (Equals(cluster.LeaderAddress, leader))
            {
                await Task.Delay(s_leaderCheck, time, attempt.Token);
            }

            await attempt.CancelAsync();
        }
        catch (OperationCanceledException)
        {
        }
    }

    private ForwardedCommand Describe(object command)
    {
        var principal = principals.Principal;
        forwarded.RequestId ??= Guid.CreateVersion7(time.GetUtcNow());
        return new ForwardedCommand(
            forwarded.RequestId.Value,
            StateTransactionBehavior.ActionName(command.GetType()),
            JsonSerializer.SerializeToElement(command, command.GetType(), ForwardingJson.Options),
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

    [LoggerMessage(Level = LogLevel.Debug, Message = "Couldn't forward a command to the leader at {Leader}, retrying: {Reason}")]
    private partial void LogRetrying(IPAddress leader, string reason);

    [LoggerMessage(Level = LogLevel.Debug, Message = "The leader at {Leader} answered {Status} to a forwarded command, retrying")]
    private partial void LogRefused(IPAddress leader, HttpStatusCode status);
}
