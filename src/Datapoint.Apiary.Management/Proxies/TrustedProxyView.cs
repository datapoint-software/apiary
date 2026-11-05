using Datapoint.Apiary.Cluster.Proxies;

namespace Datapoint.Apiary.Management.Proxies;

public sealed record TrustedProxyView(Guid Id, string Range, string? Note, bool Public, DateTimeOffset? LastRequestAt)
{
    public static TrustedProxyView Of(TrustedProxy proxy, DateTimeOffset? lastRequestAt) =>
        new(proxy.Id, proxy.Range, proxy.Note, TrustedProxyRanges.IsPublic(proxy.Range), lastRequestAt);
}
