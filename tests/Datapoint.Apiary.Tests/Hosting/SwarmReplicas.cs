using System.Collections.Concurrent;
using System.Globalization;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class SwarmReplicas : IAsyncDisposable
{
    private readonly TemporaryDirectory _directory = new();
    private readonly ConcurrentDictionary<int, ApiaryApp> _running = new();
    private readonly int _raftPort = ApiaryApp.FreePort();
    private readonly int _clusterPort = ApiaryApp.FreePort();

    private SwarmReplicas(RootKey rootKey, IReadOnlyDictionary<string, string> settings)
    {
        RootKey = rootKey;
        _settings = settings;
        File.WriteAllText(RootKeyFile(rootKey), rootKey.Format());
    }

    private readonly IReadOnlyDictionary<string, string> _settings;

    public DockerDns Dns { get; } = new();

    public RootKey RootKey { get; }

    public ApiaryApp this[int replica] => _running[replica];

    public ApiaryApp Leader => _running.Values.Single(r => r.Cluster.IsLeader);

    public bool LeaderHas(Func<ApiaryApp, bool> condition) => _running.Values.Any(r => r.Cluster.IsLeader && condition(r));

    public IReadOnlyList<ApiaryApp> Followers => [.. _running.Values.Where(r => !r.Cluster.IsLeader)];

    public IReadOnlyCollection<ApiaryApp> Running => [.. _running.Values];

    public string DataDirectoryOf(int replica) => Path.Combine(_directory.Path, $"replica-{replica}", "data");

    public int SlotOf(ApiaryApp app) => _running.Single(r => r.Value == app).Key;

    public int[] OtherSlots(int replica) => [.. _running.Keys.Where(n => n != replica).Order()];

    public static async Task<SwarmReplicas> StartAsync(int replicas, IReadOnlyDictionary<string, string>? settings = null)
    {
        Assert.SkipUnless(LoopbackAliases.Available(replicas + 1), LoopbackAliases.Missing);
        var swarm = new SwarmReplicas(RootKey.Generate(), settings ?? new Dictionary<string, string>(StringComparer.Ordinal));
        foreach (var replica in Enumerable.Range(1, replicas))
        {
            swarm.Dns.Add(LoopbackAliases.Address(replica));
        }

        await Task.WhenAll(Enumerable.Range(1, replicas).Select(replica => swarm.StartReplicaAsync(replica)));
        return swarm;
    }

    public async Task<ApiaryApp> StartReplicaAsync(int replica, RootKey? rootKey = null)
    {
        Dns.Add(LoopbackAliases.Address(replica));
        var key = rootKey ?? RootKey;
        await File.WriteAllTextAsync(RootKeyFile(key), key.Format(), TestContext.Current.CancellationToken);
        var app = await ApiaryApp.StartAsync(() => Create(replica, key), readyWithin: TimeSpan.FromSeconds(60));
        _running[replica] = app;
        return app;
    }

    public ApiaryApp Launch(int replica)
    {
        Dns.Add(LoopbackAliases.Address(replica));
        var app = Create(replica, RootKey);
        app.UseKestrel();
        app.StartServer();
        _running[replica] = app;
        return app;
    }

    public async Task CrashReplicaAsync(int replica)
    {
        _running[replica].Cluster.LeaveWithoutNotice();
        await StopReplicaAsync(replica);
    }

    public async Task StopReplicaAsync(int replica)
    {
        Dns.Remove(LoopbackAliases.Address(replica));
        if (!_running.TryRemove(replica, out var app))
        {
            return;
        }

        await app.DisposeAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await Task.WhenAll(_running.Keys.ToList().Select(StopReplicaAsync));
        _directory.Dispose();
    }

    private string RootKeyFile(RootKey key) => Path.Combine(_directory.Path, $"root-key-{key.Id}");

    private ApiaryApp Create(int replica, RootKey rootKey)
    {
        var home = Path.Combine(_directory.Path, $"replica-{replica}");
        return new ApiaryApp
        {
            Settings = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["Apiary:Mode"] = "Swarm",
                ["Apiary:Slot"] = Text(replica),
                ["Apiary:NodeName"] = $"node-{replica}",
                ["Apiary:ClusterBindAddress"] = LoopbackAliases.Address(replica).ToString(),
                ["Apiary:RaftPort"] = Text(_raftPort),
                ["Apiary:ClusterPort"] = Text(_clusterPort),
                ["Apiary:RootKeyFile"] = RootKeyFile(rootKey),
                ["Apiary:DataDirectory"] = DataDirectoryOf(replica),
                ["Apiary:KeyDirectory"] = Path.Combine(home, "keys"),
            }.Concat(_settings).GroupBy(s => s.Key, StringComparer.Ordinal).ToDictionary(g => g.Key, g => g.Last().Value, StringComparer.Ordinal),
            TestServices = services => services.AddSingleton<IPeerNetwork>(new FakePeerNetwork(Dns, LoopbackAliases.Address(replica))),
        };
    }

    private static string Text(int value) => value.ToString(CultureInfo.InvariantCulture);
}
