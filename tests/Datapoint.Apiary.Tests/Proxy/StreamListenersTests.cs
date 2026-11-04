using Datapoint.Apiary.Proxy.Network;
using Datapoint.Apiary.Proxy.Routing;
using Datapoint.Apiary.Proxy.Streams;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class StreamListenersTests
{
    [Fact]
    public async Task A_state_change_after_disposal_is_ignored()
    {
        using var cluster = new FakeClusterState();
        var listeners = Listeners(cluster);
        await listeners.StartAsync(TestContext.Current.CancellationToken);
        Assert.True(await Eventually.TrueAsync(() => cluster.ChangeTokenRequests > 0));

        listeners.Dispose();

        await cluster.AppendAsync(AnEntry(), TestContext.Current.CancellationToken);
    }

    private static StreamListeners Listeners(FakeClusterState cluster) =>
        new(
            cluster,
            new TargetConnector(new OwnEndpoints(new HashSet<int>(), new HashSet<int>()), NullLogger<TargetConnector>.Instance),
            new AddressAllowlists(),
            new StreamConnections(TimeProvider.System),
            TimeProvider.System,
            NullLogger<StreamListeners>.Instance);
}
