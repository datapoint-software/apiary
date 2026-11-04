using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Cluster.Tests.Raft;

public sealed class StandaloneReplica : IAsyncDisposable
{
    private readonly ClusterClient _client;
    private bool _stopped;

    private StandaloneReplica(string directory, RootKey rootKey, int port, int snapshotEvery)
    {
        var options = Options.Create(new ClusterOptions
        {
            DataDirectory = directory,
            Mode = ClusterMode.Standalone,
            NodeName = "node-a",
            RaftPort = port,
            SnapshotEvery = snapshotEvery,
        });
        _client = new ClusterClient(options);
        Encryption = new StateEncryption(rootKey, TimeProvider.System);
        Cluster = new RaftClusterState(
            options,
            Encryption,
            new JoinProtocol(rootKey),
            _client,
            new PeerDiscovery(options, new DockerPeerNetwork(), TimeProvider.System),
            Lifetime,
            TimeProvider.System,
            NullLoggerFactory.Instance,
            NullLogger<RaftClusterState>.Instance);
    }

    public RaftClusterState Cluster { get; }

    public StateEncryption Encryption { get; }

    public RecordingLifetime Lifetime { get; } = new();

    public static int FreePort() => FreePorts.Next();

    public static async Task<StandaloneReplica> StartAsync(string directory, RootKey rootKey, int port, int snapshotEvery = 1000)
    {
        var replica = new StandaloneReplica(directory, rootKey, port, snapshotEvery);
        await replica.Cluster.StartAsync(TestContext.Current.CancellationToken);
        return replica;
    }

    public static async Task<StandaloneReplica> StartReadyAsync(string directory, RootKey rootKey, int port, int snapshotEvery = 1000)
    {
        var replica = await StartAsync(directory, rootKey, port, snapshotEvery);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(30));
        await replica.Cluster.WaitUntilReadyAsync(timeout.Token);
        return replica;
    }

    public async Task StopAsync()
    {
        if (_stopped)
        {
            return;
        }

        _stopped = true;
        await Cluster.StopAsync(CancellationToken.None);
        await Cluster.DisposeAsync();
        _client.Dispose();
    }

    public ValueTask DisposeAsync() => new(StopAsync());
}
