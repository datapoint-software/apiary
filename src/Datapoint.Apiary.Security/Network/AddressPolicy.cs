using System.Net;

namespace Datapoint.Apiary.Security.Network;

public static class AddressPolicy
{
    private static readonly IPNetwork s_linkLocalV4 = IPNetwork.Parse("169.254.0.0/16");
    private static readonly IPNetwork s_nat64 = IPNetwork.Parse("64:ff9b::/96");
    private static readonly IPAddress[] s_metadata = [IPAddress.Parse("100.100.100.200"), IPAddress.Parse("fd00:ec2::254")];

    public static AddressKind Classify(IPAddress address)
    {
        var mapped = address.IsIPv4MappedToIPv6 || s_nat64.Contains(address) ? new IPAddress(address.GetAddressBytes()[^4..]) : address;
        if (IPAddress.IsLoopback(mapped))
        {
            return AddressKind.Loopback;
        }

        if (mapped.Equals(IPAddress.Any) || mapped.Equals(IPAddress.IPv6Any))
        {
            return AddressKind.Unspecified;
        }

        var isLinkLocal = mapped.IsIPv6LinkLocal || s_linkLocalV4.Contains(mapped) || s_metadata.Contains(mapped);
        return isLinkLocal ? AddressKind.LinkLocal : AddressKind.Routable;
    }

    public static bool IsLoopbackName(string host) =>
        host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);
}
