using System.Net.Http.Headers;
using System.Text;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.SingleSignOn;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Datapoint.Apiary.SingleSignOn;

public sealed partial class SsoSignIn(
    IClusterState cluster,
    SsoProviders providers,
    SsoFlowCookie cookie,
    SsoAssertions assertions,
    IMediator mediator,
    ILogger<SsoSignIn> logger)
{
    public const string CallbackPath = SsoFlowCookie.Path + "/callback";

    public async Task<IResult> StartAsync(HttpContext context, string? next)
    {
        if (cluster.Current.SingleSignOn is not { Enabled: true } settings)
        {
            return Failed(ErrorCodes.SsoOff);
        }

        var configuration = await DiscoverAsync(settings, context.RequestAborted);
        if (configuration?.AuthorizationEndpoint is not { Length: > 0 } endpoint)
        {
            return Failed(ErrorCodes.SsoFailed);
        }

        var flow = cookie.Start(context, settings.Issuer, SafeNext(next));
        var query = QueryString.Create(new KeyValuePair<string, string?>[]
        {
            new("response_type", "code"),
            new("client_id", settings.ClientId),
            new("redirect_uri", RedirectUri(context.Request)),
            new("scope", "openid email profile"),
            new("state", flow.State),
            new("nonce", flow.Nonce),
            new("code_challenge", SecretTokens.Hash(flow.Verifier)),
            new("code_challenge_method", "S256"),
        });
        var separator = endpoint.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        return Results.Redirect(endpoint + separator + query.Value![1..]);
    }

    public async Task<IResult> FinishAsync(HttpContext context)
    {
        var flow = cookie.Finish(context);
        var request = context.Request;
        if (flow is null || request.Query["state"].ToString() != flow.State)
        {
            return Failed(ErrorCodes.SsoFailed);
        }

        if (cluster.Current.SingleSignOn is not { Enabled: true } settings || settings.Issuer != flow.Issuer)
        {
            return Failed(ErrorCodes.SsoOff);
        }

        if (request.Query["code"].ToString() is not { Length: > 0 } code)
        {
            return Failed(ErrorCodes.SsoFailed);
        }

        var claims = await CheckAsync(settings, flow, code, RedirectUri(request), context.RequestAborted);
        return claims is null ? Failed(ErrorCodes.SsoFailed) : await SignInAsync(settings, claims, flow.Next, context.RequestAborted);
    }

    private async Task<SsoClaims?> CheckAsync(SsoSettings settings, SsoFlow flow, string code, string redirectUri, CancellationToken ct)
    {
        var configuration = await DiscoverAsync(settings, ct);
        if (configuration?.TokenEndpoint is not { Length: > 0 } endpoint)
        {
            return null;
        }

        var idToken = await ExchangeAsync(endpoint, settings, flow, code, redirectUri, ct);
        return idToken is null ? null : await SsoIdTokens.ValidateAsync(idToken, configuration, settings, flow);
    }

    private async Task<string?> ExchangeAsync(string endpoint, SsoSettings settings, SsoFlow flow, string code, string redirectUri, CancellationToken ct)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new FormUrlEncodedContent(
            [
                new("grant_type", "authorization_code"),
                new("code", code),
                new("redirect_uri", redirectUri),
                new("code_verifier", flow.Verifier),
            ]),
        };
        message.Headers.Authorization = new AuthenticationHeaderValue("Basic", BasicCredentials(settings));
        try
        {
            using var response = await providers.Client().SendAsync(message, ct);
            if (!response.IsSuccessStatusCode)
            {
                LogExchangeRefused(logger, (int)response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadFromJsonAsync(SsoHostJsonContext.Default.SsoTokenResponse, ct);
            return body?.IdToken;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            LogExchangeFailed(logger, exception);
            return null;
        }
    }

    private async Task<IResult> SignInAsync(SsoSettings settings, SsoClaims claims, string next, CancellationToken ct)
    {
        try
        {
            var assertion = assertions.Seal(settings.Issuer, claims.Subject, claims.Email, claims.Name, claims.Groups);
            await mediator.SendAsync(new SignInWithSso(assertion), ct);
            return Continue(next);
        }
        catch (ActionFailedException failed)
        {
            return Failed(failed.Code);
        }
    }

    private async Task<OpenIdConnectConfiguration?> DiscoverAsync(SsoSettings settings, CancellationToken ct)
    {
        try
        {
            return await providers.DiscoverAsync(settings.Issuer, ct);
        }
        catch (InvalidOperationException exception)
        {
            LogDiscoveryFailed(logger, settings.Issuer, exception);
            return null;
        }
    }

    private static string BasicCredentials(SsoSettings settings) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(
            Uri.EscapeDataString(settings.ClientId) + ":" + Uri.EscapeDataString(settings.ClientSecret ?? string.Empty)));

    private static string RedirectUri(HttpRequest request) => $"{request.Scheme}://{request.Host}{CallbackPath}";

    private static string SafeNext(string? next) =>
        next is { Length: > 0 and <= 2000 } && next[0] == '/' && !next.StartsWith("//", StringComparison.Ordinal) && next.All(IsSafeInPath)
            ? next
            : "/";

    private static bool IsSafeInPath(char c) => c is > ' ' and < '\u007f' and not '\\';

    private static IResult Failed(string code) => Results.Redirect("/sign-in?error=" + Uri.EscapeDataString(code));

    private static IResult Continue(string next)
    {
        var url = System.Net.WebUtility.HtmlEncode(next);
        return Results.Content(
            $"<!doctype html><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url={url}\"><title>Signing in</title><a href=\"{url}\">Continue</a>",
            "text/html; charset=utf-8");
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "The identity provider refused the sign-in code with status {Status}.")]
    private static partial void LogExchangeRefused(ILogger logger, int status);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Exchanging the sign-in code with the identity provider failed.")]
    private static partial void LogExchangeFailed(ILogger logger, Exception exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Reading the identity provider's configuration from {Issuer} failed.")]
    private static partial void LogDiscoveryFailed(ILogger logger, string issuer, Exception exception);
}
