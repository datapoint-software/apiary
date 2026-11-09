using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class ListDnsProvidersHandler(IClusterState cluster) : IQueryHandler<ListDnsProviders, IReadOnlyList<DnsProviderView>>
{
    public ValueTask<IReadOnlyList<DnsProviderView>> HandleAsync(ListDnsProviders query, CancellationToken cancellationToken = default)
    {
        var state = cluster.Current;
        IReadOnlyList<DnsProviderView> providers = [.. state.DnsProviders.Values.OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase).Select(p => DnsProviderView.From(state, p))];
        return new(providers);
    }
}
