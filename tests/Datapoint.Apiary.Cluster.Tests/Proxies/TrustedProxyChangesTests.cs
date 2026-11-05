using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Proxies;

public sealed class TrustedProxyChangesTests
{
    [Fact]
    public void No_proxy_is_trusted_at_first() =>
        Assert.Empty(ApiaryState.Empty.TrustedProxies);

    [Fact]
    public void Saving_a_proxy_trusts_it()
    {
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", "Load balancer");

        var state = ApiaryState.Empty.With(new TrustedProxySaved(proxy));

        Assert.Equal(proxy, state.TrustedProxies[proxy.Id]);
    }

    [Fact]
    public void Saving_a_proxy_again_replaces_it()
    {
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", "Load balancer");

        var state = ApiaryState.Empty.With(new TrustedProxySaved(proxy), new TrustedProxySaved(proxy with { Range = "10.20.31.0/24" }));

        Assert.Equal("10.20.31.0/24", Assert.Single(state.TrustedProxies).Value.Range);
    }

    [Fact]
    public void Removing_a_proxy_stops_trusting_it()
    {
        var proxy = new TrustedProxy(AnId(), "10.20.30.0/24", null);

        var state = ApiaryState.Empty.With(new TrustedProxySaved(proxy), new TrustedProxyRemoved(proxy.Id));

        Assert.Empty(state.TrustedProxies);
    }

    [Fact]
    public void Trusting_a_proxy_needs_every_replica_on_the_third_schema() =>
        Assert.Equal(3, StateSchema.Required(AnEntry(new TrustedProxySaved(new TrustedProxy(AnId(), "10.20.30.0/24", null)))));
}
