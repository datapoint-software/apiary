using System.Net;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Proxy.Forwarding;

/// <summary>
/// What a trusted proxy says about the client: the addresses in its X-Forwarded-For, and the client's address and
/// scheme read from them and from X-Forwarded-Proto.
/// </summary>
public sealed record ForwardedChain(IReadOnlyList<string> Addresses, IPAddress? Client, string? Scheme)
{
    public const int MaximumAddresses = 20;
    public const string ForHeader = "X-Forwarded-For";
    public const string ProtoHeader = "X-Forwarded-Proto";

    /// <summary>
    /// Reads X-Forwarded-For from the right, skipping addresses that are trusted too, and takes the first one that
    /// isn't as the client. The scheme is the X-Forwarded-Proto value of the same hop when each proxy added one, or the
    /// only value when they replace it; only http and https count. Returns null when X-Forwarded-For has more than
    /// <see cref="MaximumAddresses"/> addresses or anything that isn't one, so the request is handled as if it came
    /// from anyone.
    /// </summary>
    public static ForwardedChain? Read(StringValues forwardedFor, StringValues forwardedProto, Func<IPAddress, bool> trusted)
    {
        var entries = Split(forwardedFor);
        if (entries.Count > MaximumAddresses)
        {
            return null;
        }

        var addresses = new IPAddress[entries.Count];
        for (var i = 0; i < entries.Count; i++)
        {
            if (Address(entries[i]) is not { } address)
            {
                return null;
            }

            addresses[i] = address;
        }

        var client = addresses.Length - 1;
        while (client > 0 && trusted(addresses[client]))
        {
            client--;
        }

        var hop = addresses.Length == 0 ? 0 : addresses.Length - 1 - client;
        return new ForwardedChain(entries, addresses.Length == 0 ? null : addresses[client], SchemeOf(Split(forwardedProto), hop));
    }

    private static string? SchemeOf(List<string> protos, int hop)
    {
        var proto = protos.Count == 1 ? protos[0] : hop < protos.Count ? protos[protos.Count - 1 - hop] : null;
        return proto?.ToLowerInvariant() switch
        {
            "http" => "http",
            "https" => "https",
            _ => null,
        };
    }

    private static List<string> Split(StringValues values) =>
        [.. values.SelectMany(v => (v ?? string.Empty).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))];

    // Some load balancers add the client's port, as in 203.0.113.9:51234 or [2001:db8::1]:51234.
    private static IPAddress? Address(string entry)
    {
        if (IPAddress.TryParse(entry, out var address))
        {
            return TrustedProxies.Normalize(address);
        }

        return IPEndPoint.TryParse(entry, out var endpoint) ? TrustedProxies.Normalize(endpoint.Address) : null;
    }
}
