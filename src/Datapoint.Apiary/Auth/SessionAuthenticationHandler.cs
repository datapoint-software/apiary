using System.Text.Encodings.Web;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Tokens;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Auth;

public sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IClusterState cluster,
    TimeProvider time) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(SessionCookie.Name, out var token) || string.IsNullOrEmpty(token))
        {
            return AuthenticateResult.NoResult();
        }

        var hash = SecretTokens.Hash(token);
        if (!cluster.Current.Sessions.Values.Any(s => s.TokenHash == hash))
        {
            await cluster.SyncAsync(Context.RequestAborted);
        }

        var state = cluster.Current;
        var session = state.Sessions.Values.FirstOrDefault(s => s.TokenHash == hash);
        return SessionPrincipals.Create(state, session, time.GetUtcNow(), Scheme.Name) is { } principal
            ? AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name))
            : AuthenticateResult.NoResult();
    }
}
