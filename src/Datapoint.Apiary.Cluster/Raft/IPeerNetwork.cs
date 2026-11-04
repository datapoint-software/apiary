using System.Net;

namespace Datapoint.Apiary.Cluster.Raft;

public interface IPeerNetwork
{
    Task<IReadOnlyList<IPAddress>> ResolveAsync(string serviceName, CancellationToken cancellationToken);

    IReadOnlySet<IPAddress> LocalAddresses();
}
