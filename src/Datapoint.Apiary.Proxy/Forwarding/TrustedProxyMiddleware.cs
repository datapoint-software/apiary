using Microsoft.AspNetCore.Http;

namespace Datapoint.Apiary.Proxy.Forwarding;

/// <summary>
/// On the public ports, makes the client's address and scheme from a trusted proxy's headers the request's own, so
/// allowlists, rate limits, password tries, HTTPS and the access log use them. Never used on the admin port.
/// </summary>
public sealed class TrustedProxyMiddleware(RequestDelegate next, TrustedProxies proxies)
{
    public Task InvokeAsync(HttpContext context)
    {
        if (context.Connection.RemoteIpAddress is { } connection && proxies.Find(connection) is { } proxy)
        {
            proxies.Seen(proxy);
            var headers = context.Request.Headers;
            if (ForwardedChain.Read(headers[ForwardedChain.ForHeader], headers[ForwardedChain.ProtoHeader], proxies.Trusts) is { } chain)
            {
                context.Features.Set(new ProxiedRequest(TrustedProxies.Normalize(connection), chain.Addresses));
                context.Connection.RemoteIpAddress = chain.Client ?? context.Connection.RemoteIpAddress;
                context.Request.Scheme = chain.Scheme ?? context.Request.Scheme;
            }
        }

        return next(context);
    }
}
