using System.Net;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Hosting;

public static class AdminSecurityHeaders
{
    private const string Policy =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
        + "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    private const string StrictTransport = "max-age=31536000";

    public static IApplicationBuilder UseAdminSecurityHeaders(this IApplicationBuilder app)
    {
        var cluster = app.ApplicationServices.GetRequiredService<IClusterState>();
        return app.Use((context, next) =>
        {
            var headers = context.Response.Headers;
            headers.XFrameOptions = "DENY";
            headers.ContentSecurityPolicy = Policy;
            headers.XContentTypeOptions = "nosniff";
            headers["Referrer-Policy"] = "same-origin";
            if (context.Request.IsHttps && cluster.Current.AdminCertificate is { SelfSigned: false } && IsNamedHost(context.Request.Host.Host))
            {
                headers.StrictTransportSecurity = StrictTransport;
            }

            return next(context);
        });
    }

    private static bool IsNamedHost(string host) =>
        !IPAddress.TryParse(host, out _)
        && !host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        && !host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);
}
