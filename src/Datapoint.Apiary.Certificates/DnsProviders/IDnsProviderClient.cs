using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public interface IDnsProviderClient
{
    DnsProviderKind Kind { get; }

    Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken);

    Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken);
}
