using System.Text.Encodings.Web;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Tokens;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Auth;

public sealed class AgentAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IClusterState cluster,
    TimeProvider time) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Prefix = "Bearer ";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase) || header.Length == Prefix.Length)
        {
            return AuthenticateResult.NoResult();
        }

        var hash = SecretTokens.Hash(header[Prefix.Length..].Trim());
        if (!cluster.Current.Agents.Values.Any(a => a.Tokens?.AccessHash == hash))
        {
            await cluster.SyncAsync(Context.RequestAborted);
        }

        var state = cluster.Current;
        var agent = state.Agents.Values.FirstOrDefault(a => a.Tokens?.AccessHash == hash);
        return AgentPrincipals.Create(state, agent, time.GetUtcNow(), Scheme.Name) is { } principal
            ? AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name))
            : AuthenticateResult.Fail("The access token isn't valid.");
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.Headers.WWWAuthenticate = $"Bearer resource_metadata=\"{OAuthEndpoints.ResourceMetadataUrl(Request)}\"";
        return Task.CompletedTask;
    }
}
