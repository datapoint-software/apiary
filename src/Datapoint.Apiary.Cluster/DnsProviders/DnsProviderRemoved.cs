using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.DnsProviders;

[StateSchema(5)]
public sealed record DnsProviderRemoved(Guid ProviderId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { DnsProviders = state.DnsProviders.Remove(ProviderId) };
}
