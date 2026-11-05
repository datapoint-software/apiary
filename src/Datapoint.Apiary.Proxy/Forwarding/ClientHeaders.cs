using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Datapoint.Apiary.Proxy.Forwarding;

/// <summary>
/// The forwarded headers a target gets. Apiary writes X-Forwarded-For, -Proto, -Host and -Prefix itself. From a trusted
/// proxy, X-Forwarded-For keeps the proxy's chain with the proxy added, and the headers below pass on as it sent them.
/// From anyone else they're dropped: services read them as the client's address, or as the scheme, port, host or path
/// the client asked for, so a visitor could set them to anything and a service that reads them would believe it.
/// </summary>
public static class ClientHeaders
{
    public static readonly IReadOnlyList<string> Spoofable =
    [
        "Forwarded",

        // The client's address
        "X-Real-IP",
        "X-Client-IP",
        "Client-IP",
        "X-Cluster-Client-IP",
        "True-Client-IP",
        "CF-Connecting-IP",
        "Fastly-Client-IP",
        "X-Original-Forwarded-For",
        "X-ProxyUser-Ip",

        // The path, which IIS and some frameworks route on instead of the request's own
        "X-Original-URL",
        "X-Rewrite-URL",

        // What services build links and redirects from
        "X-Forwarded-Port",
        "X-Forwarded-Server",
        "X-Forwarded-Ssl",
        "X-Forwarded-Scheme",
        "X-Host",
    ];

    public static void Apply(TransformBuilderContext context)
    {
        // Set, not appended: X-Forwarded-For is the client's address, which a trusted proxy's chain may have replaced.
        context.UseDefaultForwarders = false;
        context.AddXForwardedFor(action: ForwardedTransformActions.Set);
        context.AddXForwardedProto(action: ForwardedTransformActions.Set);
        context.AddXForwardedHost(action: ForwardedTransformActions.Set);
        context.AddXForwardedPrefix(action: ForwardedTransformActions.Set);
        context.AddRequestTransform(transform =>
        {
            if (transform.HttpContext.Features.Get<ProxiedRequest>() is { } proxied)
            {
                RequestTransform.RemoveHeader(transform, ForwardedChain.ForHeader);
                RequestTransform.AddHeader(transform, ForwardedChain.ForHeader, string.Join(", ", [.. proxied.ForwardedFor, proxied.Proxy.ToString()]));
                return ValueTask.CompletedTask;
            }

            foreach (var name in Spoofable)
            {
                RequestTransform.RemoveHeader(transform, name);
            }

            return ValueTask.CompletedTask;
        });
    }
}
