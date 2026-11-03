using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Auth;

public sealed class LocalOperatorAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    LocalOperatorToken token) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Prefix = "Local ";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        var isLoopback = Context.Connection.RemoteIpAddress is { } address && IPAddress.IsLoopback(address);
        if (!isLoopback || !header.StartsWith(Prefix, StringComparison.Ordinal) || !Matches(header[Prefix.Length..]))
        {
            return Task.FromResult(AuthenticateResult.Fail("The local operator token isn't valid."));
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ApiaryClaims.Email, "local operator"),
                new Claim(ApiaryClaims.Role, nameof(Role.Administrator)),
                new Claim(ApiaryClaims.Local, "true"),
            ],
            Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }

    private bool Matches(string candidate) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(candidate), Encoding.UTF8.GetBytes(token.Value));
}
