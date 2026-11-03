using System.Globalization;
using Datapoint.Apiary.Certificates.Challenges;
using Datapoint.Apiary.Certificates.Selection;
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
        if (context.Request.IsHttps)
        {
            AdvertiseHttp3(context);
            await next(context);
            return;
        }

        if (AcmeChallengeResponder.IsChallenge(context))
        {
            await challenges.RespondAsync(context);
            return;
        }

        if (certificates.Has(context.Request.Host.Host))
        {
            RedirectToHttps(context);
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

    private void RedirectToHttps(HttpContext context)
    {
        var port = options.Value.PublicHttpsPort;
        var host = port == DefaultHttpsPort ? new HostString(context.Request.Host.Host) : new HostString(context.Request.Host.Host, port);
        var target = UriHelper.BuildAbsolute("https", host, context.Request.PathBase, context.Request.Path, context.Request.QueryString);
        context.Response.StatusCode = StatusCodes.Status308PermanentRedirect;
        context.Response.Headers.Location = target;
    }
}
