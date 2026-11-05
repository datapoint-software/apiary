using System.Globalization;
using Datapoint.Apiary.Certificates.Challenges;
using Datapoint.Apiary.Certificates.Selection;
using Datapoint.Apiary.Proxy.Forwarding;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Hosting;

public sealed class PublicHttpsMiddleware(
    RequestDelegate next,
    AcmeChallengeResponder challenges,
    CertificateSelector certificates,
    IOptions<ApiaryOptions> options)
{
    private const int DefaultHttpsPort = 443;

    public async Task InvokeAsync(HttpContext context)
    {
        // Behind a trusted proxy, the client talks to the proxy: its scheme comes from X-Forwarded-Proto, and HTTP/3
        // and Apiary's own HTTPS port mean nothing to it. A proxy that ends TLS can send the certificate authority's
        // check as HTTPS too.
        var proxied = context.Features.Get<ProxiedRequest>() is not null;
        if (AcmeChallengeResponder.IsChallenge(context) && (!context.Request.IsHttps || proxied))
        {
            await challenges.RespondAsync(context);
            return;
        }

        if (context.Request.IsHttps)
        {
            if (!proxied)
            {
                AdvertiseHttp3(context);
            }

            await next(context);
            return;
        }

        if (certificates.Has(context.Request.Host.Host))
        {
            RedirectToHttps(context, proxied ? DefaultHttpsPort : options.Value.PublicHttpsPort);
            return;
        }

        await next(context);
    }

    private void AdvertiseHttp3(HttpContext context)
    {
        if (HttpProtocol.IsHttp3(context.Request.Protocol))
        {
            return;
        }

        context.Response.Headers.AltSvc = string.Create(CultureInfo.InvariantCulture, $"h3=\":{options.Value.PublicHttpsPort}\"; ma=86400");
    }

    private static void RedirectToHttps(HttpContext context, int port)
    {
        var host = port == DefaultHttpsPort ? new HostString(context.Request.Host.Host) : new HostString(context.Request.Host.Host, port);
        var target = UriHelper.BuildAbsolute("https", host, context.Request.PathBase, context.Request.Path, context.Request.QueryString);
        context.Response.StatusCode = StatusCodes.Status308PermanentRedirect;
        context.Response.Headers.Location = target;
    }
}
