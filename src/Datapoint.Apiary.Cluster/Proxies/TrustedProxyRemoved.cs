using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Proxies;

[StateSchema(3)]
public sealed record TrustedProxyRemoved(Guid ProxyId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { TrustedProxies = state.TrustedProxies.Remove(ProxyId) };
}
