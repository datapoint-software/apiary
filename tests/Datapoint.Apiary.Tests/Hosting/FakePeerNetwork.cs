using System.Net;
using Datapoint.Apiary.Cluster.Raft;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class FakePeerNetwork(DockerDns dns, IPAddress own) : IPeerNetwork
{
    public Task<IReadOnlyList<IPAddress>> ResolveAsync(string serviceName, CancellationToken cancellationToken) =>
        Task.FromResult(dns.Running);

    public IReadOnlySet<IPAddress> LocalAddresses() => new HashSet<IPAddress> { own };
}
