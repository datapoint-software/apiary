using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Datapoint.Apiary.Proxy.Forwarding;

/// <summary>
/// Headers that services read as the client's address, or as the scheme, port, host or path the client asked for.
/// YARP replaces X-Forwarded-For, -Proto, -Host and -Prefix and drops Forwarded, but passes these on, so a visitor
/// could set them to anything and a service that reads them would believe it.
/// </summary>
public static class ClientHeaders
{
    public static readonly IReadOnlyList<string> Spoofable =
    [
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
        foreach (var name in Spoofable)
        {
            context.AddRequestHeaderRemove(name);
        }
    }
}
