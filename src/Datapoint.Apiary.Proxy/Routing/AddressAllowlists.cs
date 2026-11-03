using System.Net;
using System.Runtime.CompilerServices;
using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Proxy.Routing;

public sealed class AddressAllowlists
{
    private readonly ConditionalWeakTable<Route, IPNetwork[]> _networks = [];

    public bool Allows(Route route, IPAddress? address)
    {
        if (route.AllowedAddresses is not { Count: > 0 } allowed)
        {
            return true;
        }

        if (address is null)
        {
            return false;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        foreach (var network in _networks.GetValue(route, _ => Parse(allowed)))
        {
            if (network.Contains(address))
            {
                return true;
            }
        }

        return false;
    }

    private static IPNetwork[] Parse(IReadOnlyList<string> allowed)
    {
        var networks = new List<IPNetwork>(allowed.Count);
        foreach (var entry in allowed)
        {
            if (IPNetwork.TryParse(entry, out var network))
            {
                networks.Add(network);
            }
            else if (IPAddress.TryParse(entry, out var address))
            {
                networks.Add(new IPNetwork(address, address.GetAddressBytes().Length * 8));
            }
        }

        return [.. networks];
    }
}
