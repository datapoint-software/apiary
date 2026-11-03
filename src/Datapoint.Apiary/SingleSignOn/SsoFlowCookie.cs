using System.Text.Json;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.SingleSignOn;

public sealed class SsoFlowCookie(SealedTokens tokens, TimeProvider time)
{
    public const string Name = "apiary_sso";
    public const string Path = "/auth/sso";
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);

    private const string Purpose = "apiary.sso-flow";

    public SsoFlow Start(HttpContext context, string issuer, string next)
    {
        var flow = new SsoFlow(issuer, SecretTokens.New(), SecretTokens.New(), SecretTokens.New(), next, time.GetUtcNow() + Lifetime);
        var value = tokens.Seal(Purpose, JsonSerializer.SerializeToUtf8Bytes(flow, SsoHostJsonContext.Default.SsoFlow));
        context.Response.Cookies.Append(Name, value, Options(context, Lifetime));
        return flow;
    }

    public SsoFlow? Finish(HttpContext context)
    {
        var value = context.Request.Cookies[Name];
        context.Response.Cookies.Delete(Name, Options(context, null));
        var payload = string.IsNullOrEmpty(value) ? null : tokens.Open(Purpose, value);
        var flow = payload is null ? null : JsonSerializer.Deserialize(payload, SsoHostJsonContext.Default.SsoFlow);
        return flow is not null && flow.ExpiresAt > time.GetUtcNow() ? flow : null;
    }

    private static CookieOptions Options(HttpContext context, TimeSpan? maxAge) => new()
    {
        HttpOnly = true,
        Secure = context.Request.IsHttps,
        SameSite = SameSiteMode.Lax,
        Path = Path,
        MaxAge = maxAge,
        IsEssential = true,
    };
}
