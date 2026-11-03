using System.Security.Claims;
using System.Text.Encodings.Web;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
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
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(SessionCookie.Name, out var token) || string.IsNullOrEmpty(token))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var state = cluster.Current;
        var hash = SecretTokens.Hash(token);
        var session = state.Sessions.Values.FirstOrDefault(s => s.TokenHash == hash);
        if (session is null
            || session.ExpiresAt <= time.GetUtcNow()
            || !state.Users.TryGetValue(session.UserId, out var user)
            || user.Status is not UserStatus.Active)
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ApiaryClaims.UserId, user.Id.ToString()),
                new Claim(ApiaryClaims.Email, user.Email),
                new Claim(ApiaryClaims.Role, user.Role.ToString()),
                new Claim(ApiaryClaims.SessionId, session.Id.ToString()),
            ],
            Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }
}
