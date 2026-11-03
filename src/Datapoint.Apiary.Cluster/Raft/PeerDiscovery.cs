using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed class PeerDiscovery(IOptions<ClusterOptions> options, TimeProvider time)
{
    private static readonly TimeSpan s_retry = TimeSpan.FromSeconds(2);

    public bool IsSwarm => options.Value.Mode is ClusterMode.Swarm;

    public async Task<IReadOnlyList<IPAddress>> ResolveAsync(CancellationToken cancellationToken)
    {
        if (!IsSwarm)
        {
            return [IPAddress.Loopback];
        }

        try
        {
            var addresses = await Dns.GetHostAddressesAsync("tasks." + options.Value.ServiceName, AddressFamily.InterNetwork, cancellationToken);
            return [.. addresses.Distinct()];
        }
        catch (SocketException)
        {
            return [];
        }
    }

    public async Task<IPEndPoint> OwnEndPointAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            var local = LocalAddresses();
            var own = (await ResolveAsync(cancellationToken)).FirstOrDefault(local.Contains);
            if (own is not null)
            {
                return new IPEndPoint(own, options.Value.RaftPort);
            }

            await Task.Delay(s_retry, time, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<IPAddress>> PeersAsync(IPAddress own, CancellationToken cancellationToken) =>
        IsSwarm ? [.. (await ResolveAsync(cancellationToken)).Where(a => !a.Equals(own))] : [];

    private static HashSet<IPAddress> LocalAddresses() =>
    [
        IPAddress.Loopback,
        .. NetworkInterface.GetAllNetworkInterfaces()
            .SelectMany(i => i.GetIPProperties().UnicastAddresses)
            .Select(a => a.Address)
            .Where(a => a.AddressFamily is AddressFamily.InterNetwork),
    ];
}
