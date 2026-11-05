using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Proxies;

[StateSchema(3)]
public sealed record TrustedProxySaved(TrustedProxy Proxy) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { TrustedProxies = state.TrustedProxies.SetItem(Proxy.Id, Proxy) };
}
