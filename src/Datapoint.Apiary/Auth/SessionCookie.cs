using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Replication;

namespace Datapoint.Apiary.Auth;

public sealed class SessionCookie(IHttpContextAccessor accessor) : ISessionCookie
{
    public const string Name = "apiary_session";

    public void Issue(string token)
    {
        if (accessor.HttpContext is not { } context)
        {
            return;
        }

        if (context.Features.Get<CookieRecorder>() is { } recorder)
        {
            recorder.Cookie = new ForwardedCookie(token);
            return;
        }

        context.Response.Cookies.Append(Name, token, Options(context));
    }

    public void Clear()
    {
        if (accessor.HttpContext is not { } context)
        {
            return;
        }

        if (context.Features.Get<CookieRecorder>() is { } recorder)
        {
            recorder.Cookie = new ForwardedCookie(null);
            return;
        }

        context.Response.Cookies.Delete(Name, Options(context));
    }

    private static CookieOptions Options(HttpContext context) => new()
    {
        HttpOnly = true,
        Secure = context.Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        IsEssential = true,
    };
}
