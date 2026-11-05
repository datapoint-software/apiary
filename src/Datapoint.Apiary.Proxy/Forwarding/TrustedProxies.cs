using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Net;
using System.Runtime.CompilerServices;
using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Proxy.Forwarding;

/// <summary>The trusted proxies in the replicated state, parsed once per change, and when each last sent a request to this replica.</summary>
public sealed class TrustedProxies(IClusterState cluster, TimeProvider time)
{
    private readonly ConditionalWeakTable<ImmutableDictionary<Guid, TrustedProxy>, Entry[]> _parsed = [];
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> _lastRequest = new();

    public bool Any => !cluster.Current.TrustedProxies.IsEmpty;

    public TrustedProxy? Find(IPAddress address)
    {
        var proxies = cluster.Current.TrustedProxies;
        if (proxies.IsEmpty)
        {
            return null;
        }

        address = Normalize(address);
        foreach (var entry in _parsed.GetValue(proxies, Parse))
        {
            if (entry.Network.Contains(address))
            {
                return entry.Proxy;
            }
        }

        return null;
    }

    public bool Trusts(IPAddress address) => Find(address) is not null;

    public void Seen(TrustedProxy proxy) => _lastRequest[proxy.Id] = time.GetUtcNow();

    public DateTimeOffset? LastRequest(Guid id) => _lastRequest.TryGetValue(id, out var at) ? at : null;

    public void Forget(IReadOnlySet<Guid> keep)
    {
        foreach (var id in _lastRequest.Keys.Where(id => !keep.Contains(id)))
        {
            _lastRequest.TryRemove(id, out _);
        }
    }

    public static IPAddress Normalize(IPAddress address) => address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;

    private static Entry[] Parse(ImmutableDictionary<Guid, TrustedProxy> proxies)
    {
        var entries = new List<Entry>(proxies.Count);
        foreach (var proxy in proxies.Values)
        {
            if (IPNetwork.TryParse(proxy.Range, out var network))
            {
                entries.Add(new Entry(proxy, network));
            }
            else if (IPAddress.TryParse(proxy.Range, out var address))
            {
                entries.Add(new Entry(proxy, new IPNetwork(address, address.GetAddressBytes().Length * 8)));
            }
        }

        return [.. entries];
    }

    private sealed record Entry(TrustedProxy Proxy, IPNetwork Network);
}
