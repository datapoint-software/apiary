using System.Net;

namespace Datapoint.Apiary.Proxy.Forwarding;

/// <summary>A request that came through a trusted proxy: the proxy's own address, and the X-Forwarded-For it sent.</summary>
public sealed record ProxiedRequest(IPAddress Proxy, IReadOnlyList<string> ForwardedFor);
