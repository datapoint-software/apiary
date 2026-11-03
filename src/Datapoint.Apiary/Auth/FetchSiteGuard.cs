using Datapoint.Apiary.Api;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Auth;

public static class FetchSiteGuard
{
    public static IApplicationBuilder UseFetchSiteGuard(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        if (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method) || IsSameOrigin(context.Request))
        {
            await next(context);
            return;
        }

        await new ApiProblem(StatusCodes.Status403Forbidden, ErrorCodes.Forbidden).ToResult().ExecuteAsync(context);
    });

    private static bool IsSameOrigin(HttpRequest request)
    {
        var site = request.Headers["Sec-Fetch-Site"].ToString();
        if (site is "cross-site" or "same-site")
        {
            return false;
        }

        var origin = request.Headers.Origin.ToString();
        return string.IsNullOrEmpty(origin)
            || (Uri.TryCreate(origin, UriKind.Absolute, out var uri) && string.Equals(uri.Authority, request.Host.Value, StringComparison.OrdinalIgnoreCase));
    }
}
