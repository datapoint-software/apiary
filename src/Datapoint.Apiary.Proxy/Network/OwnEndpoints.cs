using System.Net;
using System.Net.NetworkInformation;

namespace Datapoint.Apiary.Proxy.Network;

public sealed class OwnEndpoints(IReadOnlySet<int> ports)
{
    private readonly Lazy<HashSet<IPAddress>> _addresses = new(LocalAddresses);

    public bool IsOwn(IPAddress address, int port)
    {
        var mapped = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
        return ports.Contains(port) && _addresses.Value.Contains(mapped);
    }

    private static HashSet<IPAddress> LocalAddresses() =>
        NetworkInterface.GetAllNetworkInterfaces()
            .SelectMany(i => i.GetIPProperties().UnicastAddresses)
            .Select(a => a.Address)
            .Concat(GatewayAddresses())
            .ToHashSet();

    private static IEnumerable<IPAddress> GatewayAddresses() =>
        NetworkInterface.GetAllNetworkInterfaces()
            .SelectMany(i => i.GetIPProperties().GatewayAddresses)
            .Select(g => g.Address);
}
