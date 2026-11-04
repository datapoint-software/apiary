using System.Net.Http.Headers;
using System.Text;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.SingleSignOn;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

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

    private const string ClientSecretBasic = "client_secret_basic";
    private const string ClientSecretPost = "client_secret_post";
    private const int MaximumLogged = 200;

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
        var query = context.Request.Query;
        if (flow is null || query["state"].ToString() != flow.State)
        {
            return Failed(ErrorCodes.SsoFailed);
        }

        if (cluster.Current.SingleSignOn is not { Enabled: true } settings || settings.Issuer != flow.Issuer)
        {
            return Failed(ErrorCodes.SsoOff);
        }

        if (query["error"].ToString() is { Length: > 0 } error)
        {
            LogProviderError(logger, Printable(error), Printable(query["error_description"].ToString()));
            return Failed(ErrorCodes.SsoFailed);
        }

        try
        {
            var claims = await CheckAsync(settings, flow, query, RedirectUri(context.Request), context.RequestAborted);
            return await SignInAsync(settings, claims, flow.Next, context.RequestAborted);
        }
        catch (ActionFailedException failed)
        {
            return Failed(failed.Code);
        }
    }

    private async Task<SsoClaims> CheckAsync(SsoSettings settings, SsoFlow flow, IQueryCollection query, string redirectUri, CancellationToken ct)
    {
        var configuration = await DiscoverAsync(settings, ct);
        if (configuration?.TokenEndpoint is not { Length: > 0 } endpoint || Code(query, configuration) is not { } code)
        {
            throw ActionFailedException.Invalid(ErrorCodes.SsoFailed);
        }

        var idToken = await ExchangeAsync(endpoint, configuration, settings, flow, code, redirectUri, ct)
            ?? throw ActionFailedException.Invalid(ErrorCodes.SsoFailed);
        var result = await ValidateAsync(idToken, configuration, settings, ct);
        if (!result.IsValid || result.SecurityToken is not JsonWebToken token || !SsoIdTokens.IsFor(token, settings, flow))
        {
            LogTokenRefused(logger, result.Exception);
            throw ActionFailedException.Invalid(ErrorCodes.SsoFailed);
        }

        return SsoIdTokens.Read(token, settings.GroupsClaim) ?? throw ActionFailedException.Invalid(ErrorCodes.SsoNoEmail);
    }

    private async Task<TokenValidationResult> ValidateAsync(string idToken, OpenIdConnectConfiguration configuration, SsoSettings settings, CancellationToken ct)
    {
        var result = await SsoIdTokens.ValidateAsync(idToken, configuration, settings);
        if (!SsoIdTokens.IsKeyUnknown(result) || !providers.Refresh(settings.Issuer))
        {
            return result;
        }

        var refreshed = await DiscoverAsync(settings, ct);
        return refreshed is null ? result : await SsoIdTokens.ValidateAsync(idToken, refreshed, settings);
    }

    private async Task<string?> ExchangeAsync(
        string endpoint, OpenIdConnectConfiguration configuration, SsoSettings settings, SsoFlow flow, string code, string redirectUri, CancellationToken ct)
    {
        var methods = configuration.TokenEndpointAuthMethodsSupported;
        var post = methods.Contains(ClientSecretPost) && !methods.Contains(ClientSecretBasic);
        var (idToken, error) = await RedeemAsync(endpoint, settings, flow, code, redirectUri, post, ct);
        if (!post && error == "invalid_client" && methods.Contains(ClientSecretPost))
        {
            (idToken, _) = await RedeemAsync(endpoint, settings, flow, code, redirectUri, post: true, ct);
        }

        return idToken;
    }

    private async Task<(string? IdToken, string? Error)> RedeemAsync(
        string endpoint, SsoSettings settings, SsoFlow flow, string code, string redirectUri, bool post, CancellationToken ct)
    {
        List<KeyValuePair<string, string>> form =
        [
            new("grant_type", "authorization_code"),
            new("code", code),
            new("redirect_uri", redirectUri),
            new("code_verifier", flow.Verifier),
        ];
        if (post)
        {
            form.Add(new("client_id", settings.ClientId));
            form.Add(new("client_secret", settings.ClientSecret ?? string.Empty));
        }

        using var message = new HttpRequestMessage(HttpMethod.Post, endpoint) { Content = new FormUrlEncodedContent(form) };
        if (!post)
        {
            message.Headers.Authorization = new AuthenticationHeaderValue("Basic", BasicCredentials(settings));
        }

        try
        {
            using var response = await providers.Client().SendAsync(message, ct);
            var body = await ReadAsync(response, ct);
            if (!response.IsSuccessStatusCode)
            {
                LogExchangeRefused(logger, (int)response.StatusCode, Printable(body?.Error ?? string.Empty));
                return (null, body?.Error);
            }

            return (body?.IdToken, null);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            LogExchangeFailed(logger, exception);
            return (null, null);
        }
    }

    private static string? Code(IQueryCollection query, OpenIdConnectConfiguration configuration) =>
        query["code"].ToString() is { Length: > 0 } code && query["iss"].ToString() is var iss && (iss.Length == 0 || iss == configuration.Issuer)
            ? code
            : null;

    private static async Task<SsoTokenResponse?> ReadAsync(HttpResponseMessage response, CancellationToken ct)
    {
        try
        {
            return await response.Content.ReadFromJsonAsync(SsoHostJsonContext.Default.SsoTokenResponse, ct);
        }
        catch (Exception exception) when (exception is System.Text.Json.JsonException or NotSupportedException)
        {
            return null;
        }
    }

    private async Task<IResult> SignInAsync(SsoSettings settings, SsoClaims claims, string next, CancellationToken ct)
    {
        var assertion = assertions.Seal(settings.Issuer, claims.Subject, claims.Email, claims.Name, claims.Groups);
        await mediator.SendAsync(new SignInWithSso(assertion), ct);
        return Continue(next);
    }

    private async Task<OpenIdConnectConfiguration?> DiscoverAsync(SsoSettings settings, CancellationToken ct)
    {
        try
        {
            var configuration = await providers.DiscoverAsync(settings.Issuer, ct);
            if (configuration.Issuer?.TrimEnd('/') == settings.Issuer)
            {
                return configuration;
            }

            LogIssuerMismatch(logger, settings.Issuer, Printable(configuration.Issuer ?? string.Empty));
            return null;
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

    private static string Printable(string value) =>
        new([.. value.Where(c => c is >= ' ' and <= '~').Take(MaximumLogged)]);

    private static IResult Failed(string code) => Results.Redirect("/sign-in?error=" + Uri.EscapeDataString(code));

    private static IResult Continue(string next)
    {
        var url = System.Net.WebUtility.HtmlEncode(next);
        return Results.Content(
            $"<!doctype html><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url={url}\"><title>Signing in</title><a href=\"{url}\">Continue</a>",
            "text/html; charset=utf-8");
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "The identity provider refused the sign-in code with status {Status} and error {Error}.")]
    private static partial void LogExchangeRefused(ILogger logger, int status, string error);

    [LoggerMessage(Level = LogLevel.Warning, Message = "The identity provider answered the sign-in with error {Error}: {Description}")]
    private static partial void LogProviderError(ILogger logger, string error, string description);

    [LoggerMessage(Level = LogLevel.Warning, Message = "The ID token from the identity provider was refused.")]
    private static partial void LogTokenRefused(ILogger logger, Exception? exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "The identity provider at {Issuer} says its issuer is {Discovered}. They must be the same.")]
    private static partial void LogIssuerMismatch(ILogger logger, string issuer, string discovered);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Exchanging the sign-in code with the identity provider failed.")]
    private static partial void LogExchangeFailed(ILogger logger, Exception exception);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Reading the identity provider's configuration from {Issuer} failed.")]
    private static partial void LogDiscoveryFailed(ILogger logger, string issuer, Exception exception);
}
