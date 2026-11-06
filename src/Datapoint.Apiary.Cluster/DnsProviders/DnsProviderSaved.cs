using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.DnsProviders;

[StateSchema(5)]
public sealed record DnsProviderSaved(DnsProvider Provider) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { DnsProviders = state.DnsProviders.SetItem(Provider.Id, Provider) };
}
