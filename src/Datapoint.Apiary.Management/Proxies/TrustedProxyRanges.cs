using System.Net;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Proxies;

public static class TrustedProxyRanges
{
    public const int MaximumProxies = 100;
    public const int MaximumNoteLength = 100;

    private static readonly IPNetwork[] s_private =
    [
        IPNetwork.Parse("10.0.0.0/8"), IPNetwork.Parse("172.16.0.0/12"), IPNetwork.Parse("192.168.0.0/16"), IPNetwork.Parse("127.0.0.0/8"),
        IPNetwork.Parse("100.64.0.0/10"), IPNetwork.Parse("169.254.0.0/16"), IPNetwork.Parse("fc00::/7"), IPNetwork.Parse("::1/128"), IPNetwork.Parse("fe80::/10"),
    ];

    /// <summary>The range as Apiary stores it: "10.20.30.0/24", "2400:cb00::/32" or a single address, so the same range is never listed twice.</summary>
    public static string? Normalize(string? range)
    {
        var value = range?.Trim() ?? string.Empty;
        if (IPNetwork.TryParse(value, out var network))
        {
            return network.ToString();
        }

        return IPAddress.TryParse(value, out var address) ? address.ToString() : null;
    }

    /// <summary>Whether the range trusts every address (0.0.0.0/0 or ::/0), which would turn every allowlist off.</summary>
    public static bool IsEverything(string range) => IPNetwork.TryParse(range.Trim(), out var network) && network.PrefixLength == 0;

    /// <summary>Whether any of the range is outside private, loopback, shared and link-local addresses.</summary>
    public static bool IsPublic(string range)
    {
        var network = ToNetwork(range);
        return network is not { } n || !s_private.Any(p => p.BaseAddress.AddressFamily == n.BaseAddress.AddressFamily && n.PrefixLength >= p.PrefixLength && p.Contains(n.BaseAddress));
    }

    public static bool IsListed(ApiaryState state, string range, Guid? except = null)
    {
        var normalized = Normalize(range);
        return normalized is not null && state.TrustedProxies.Values.Any(p => p.Id != except && p.Range == normalized);
    }

    public static string? Note(string? note) => string.IsNullOrWhiteSpace(note) ? null : note.Trim();

    private static IPNetwork? ToNetwork(string range)
    {
        if (IPNetwork.TryParse(range, out var network))
        {
            return network;
        }

        return IPAddress.TryParse(range, out var address) ? new IPNetwork(address, address.GetAddressBytes().Length * 8) : null;
    }
}
