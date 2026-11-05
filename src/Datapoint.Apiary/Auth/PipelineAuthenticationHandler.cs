using System.Security.Claims;
using System.Text.Encodings.Web;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Stacks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Auth;

public sealed partial class PipelineAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IClusterState cluster,
    TimeProvider time) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Prefix = AgentAuthenticationHandler.Prefix + PipelineTokens.Prefix;

    public static bool IsPipelineToken(string authorization) => authorization.StartsWith(Prefix, StringComparison.Ordinal);

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (!IsPipelineToken(header))
        {
            return AuthenticateResult.NoResult();
        }

        var value = header[AgentAuthenticationHandler.Prefix.Length..].Trim();
        var now = time.GetUtcNow();
        if (PipelineTokens.Find(cluster.Current, value, now) is null)
        {
            await cluster.SyncAsync(Context.RequestAborted);
        }

        if (PipelineTokens.Find(cluster.Current, value, now) is not { } token)
        {
            LogRefused(Logger);
            return AuthenticateResult.Fail("The pipeline token isn't valid.");
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ApiaryClaims.Pipeline, token.Name),
                new Claim(ApiaryClaims.PipelineTokenId, token.Id.ToString()),
                new Claim(ApiaryClaims.Stack, token.Stack),
            ],
            Scheme.Name);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "A request used a pipeline token that doesn't exist, has expired or was revoked.")]
    private static partial void LogRefused(ILogger logger);
}
