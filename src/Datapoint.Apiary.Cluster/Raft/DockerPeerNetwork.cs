using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed class DockerPeerNetwork : IPeerNetwork
{
    public async Task<IReadOnlyList<IPAddress>> ResolveAsync(string serviceName, CancellationToken cancellationToken)
    {
        try
        {
            var addresses = await Dns.GetHostAddressesAsync("tasks." + serviceName, AddressFamily.InterNetwork, cancellationToken);
            return [.. addresses.Distinct()];
        }
        catch (SocketException)
        {
            return [];
        }
    }

    public IReadOnlySet<IPAddress> LocalAddresses() =>
        new HashSet<IPAddress>(
        [
            IPAddress.Loopback,
            .. NetworkInterface.GetAllNetworkInterfaces()
                .SelectMany(i => i.GetIPProperties().UnicastAddresses)
                .Select(a => a.Address)
                .Where(a => a.AddressFamily is AddressFamily.InterNetwork),
        ]);
}
