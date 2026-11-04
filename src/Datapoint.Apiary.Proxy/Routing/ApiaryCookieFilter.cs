using Datapoint.Apiary.Proxy.Passwords;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class ApiaryCookieFilter(IReadOnlySet<string> adminNames)
{
    public void Apply(TransformBuilderContext context)
    {
        context.AddRequestTransform(transform =>
        {
            var headers = transform.ProxyRequest.Headers;
            if (headers.TryGetValues(HeaderNames.Cookie, out var values) && CookieHeaderValue.TryParseList([.. values], out var cookies)
                && cookies.Any(c => IsApiaryCookie(c.Name.Value)))
            {
                headers.Remove(HeaderNames.Cookie);
                var kept = cookies.Where(c => !IsApiaryCookie(c.Name.Value)).ToList();
                if (kept.Count > 0)
                {
                    headers.TryAddWithoutValidation(HeaderNames.Cookie, string.Join("; ", kept));
                }
            }

            return ValueTask.CompletedTask;
        });
        context.AddResponseTransform(transform =>
        {
            var response = transform.HttpContext.Response;
            var setCookies = response.Headers.SetCookie;
            if (setCookies.Any(IsApiarySetCookie))
            {
                response.Headers.SetCookie = new StringValues([.. setCookies.Where(c => !IsApiarySetCookie(c))]);
            }

            return ValueTask.CompletedTask;
        });
    }

    private bool IsApiarySetCookie(string? setCookie) =>
        setCookie is not null && SetCookieHeaderValue.TryParse(setCookie, out var cookie) && IsApiaryCookie(cookie.Name.Value);

    private bool IsApiaryCookie(string? name) =>
        name is not null && (adminNames.Contains(name) || name.StartsWith(PasswordCookie.Prefix, StringComparison.Ordinal));
}
