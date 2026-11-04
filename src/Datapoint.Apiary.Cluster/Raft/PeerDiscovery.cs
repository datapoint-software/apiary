using System.Net;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed class PeerDiscovery(IOptions<ClusterOptions> options, IPeerNetwork network, TimeProvider time)
{
    private static readonly TimeSpan s_retry = TimeSpan.FromSeconds(2);

    public bool IsSwarm => options.Value.Mode is ClusterMode.Swarm;

    public async Task<IReadOnlyList<IPAddress>> ResolveAsync(CancellationToken cancellationToken) =>
        IsSwarm ? await network.ResolveAsync(options.Value.ServiceName, cancellationToken) : [IPAddress.Loopback];

    public async Task<IPEndPoint> OwnEndPointAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            var local = network.LocalAddresses();
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
}
