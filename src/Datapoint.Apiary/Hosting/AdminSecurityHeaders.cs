namespace Datapoint.Apiary.Hosting;

public static class AdminSecurityHeaders
{
    public static IApplicationBuilder UseAdminSecurityHeaders(this IApplicationBuilder app) => app.Use((context, next) =>
    {
        var headers = context.Response.Headers;
        headers.XFrameOptions = "DENY";
        headers.ContentSecurityPolicy = "frame-ancestors 'none'";
        headers.XContentTypeOptions = "nosniff";
        headers["Referrer-Policy"] = "same-origin";
        return next(context);
    });
}
