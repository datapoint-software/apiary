using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class AdminCookieFilter(IReadOnlySet<string> names)
{
    public void Apply(TransformBuilderContext context)
    {
        context.AddRequestTransform(transform =>
        {
            var headers = transform.ProxyRequest.Headers;
            if (headers.TryGetValues(HeaderNames.Cookie, out var values) && CookieHeaderValue.TryParseList([.. values], out var cookies)
                && cookies.Any(c => names.Contains(c.Name.Value ?? "")))
            {
                headers.Remove(HeaderNames.Cookie);
                var kept = cookies.Where(c => !names.Contains(c.Name.Value ?? "")).ToList();
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
            if (setCookies.Any(IsAdminCookie))
            {
                response.Headers.SetCookie = new StringValues([.. setCookies.Where(c => !IsAdminCookie(c))]);
            }

            return ValueTask.CompletedTask;
        });
    }

    private bool IsAdminCookie(string? setCookie) =>
        setCookie is not null && SetCookieHeaderValue.TryParse(setCookie, out var cookie) && names.Contains(cookie.Name.Value ?? "");
}
