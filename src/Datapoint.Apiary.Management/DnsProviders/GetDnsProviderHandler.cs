using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class GetDnsProviderHandler(IClusterState cluster) : IQueryHandler<GetDnsProvider, DnsProviderDetails>
{
    public ValueTask<DnsProviderDetails> HandleAsync(GetDnsProvider query, CancellationToken cancellationToken = default) =>
        new(DnsProviderDetails.From(cluster.Current, DnsProviderGuards.Find(cluster.Current, query.Id)));
}
