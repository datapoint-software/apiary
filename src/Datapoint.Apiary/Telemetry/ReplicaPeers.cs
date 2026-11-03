using System.Net;
using Datapoint.Apiary.Cluster.Raft;

namespace Datapoint.Apiary.Telemetry;

public static class ReplicaPeers
{
    public static async Task<IReadOnlyList<IPAddress>> ReachableAsync(RaftClusterState cluster)
    {
        var view = await cluster.DescribeAsync(CancellationToken.None);
        return [.. view.Members
            .Where(m => !m.Local && m.Reachable)
            .Select(m => IPEndPoint.TryParse(m.Address, out var endpoint) ? endpoint.Address : null)
            .OfType<IPAddress>()];
    }
}
