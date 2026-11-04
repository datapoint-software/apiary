using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Replication;

public sealed class KeyRotationTests : IAsyncLifetime
{
    private static readonly TimeSpan s_monitorCycles = TimeSpan.FromSeconds(60);
    private SwarmReplicas _swarm = null!;

    public async ValueTask InitializeAsync() => _swarm = await SwarmReplicas.StartAsync(3);

    public async ValueTask DisposeAsync() => await _swarm.DisposeAsync();

    [Fact]
    public async Task A_replica_restarted_with_a_new_root_key_gets_the_data_keys_from_the_others()
    {
        var follower = _swarm.SlotOf(_swarm.Followers[0]);
        var project = AProject("Before the new key");
        await _swarm.Leader.SeedAsync(new ProjectSaved(project));
        await _swarm.StopReplicaAsync(follower);
        var newKey = RootKey.Generate();

        var restarted = await _swarm.StartReplicaAsync(follower, newKey);

        Assert.Equal(newKey.Id, restarted.Cluster.RootKeyId);
        Assert.True(await Eventually.TrueAsync(() => restarted.State.Projects.ContainsKey(project.Id)));
    }

    [Fact]
    public async Task A_new_root_key_is_registered_for_the_whole_cluster()
    {
        var follower = _swarm.SlotOf(_swarm.Followers[0]);
        await _swarm.StopReplicaAsync(follower);
        var newKey = RootKey.Generate();

        await _swarm.StartReplicaAsync(follower, newKey);

        Assert.True(await Eventually.TrueAsync(() => _swarm.LeaderHas(l => l.State.RootKeys.Any(k => k.Keys.RootKeyId == newKey.Id))));
    }

    [Fact]
    public async Task Once_every_replica_uses_the_new_root_key_the_old_one_is_forgotten()
    {
        var newKey = RootKey.Generate();
        var followers = _swarm.Followers.Select(_swarm.SlotOf).ToArray();
        var leader = _swarm.SlotOf(_swarm.Leader);
        await RotateAsync(followers[0], newKey);
        await RotateAsync(followers[1], newKey);
        await RotateAsync(leader, newKey);

        Assert.True(await Eventually.TrueAsync(() => _swarm.LeaderHas(l => l.State.RootKeys.Count == 1), s_monitorCycles));
        Assert.Equal(newKey.Id, _swarm.Leader.State.RootKeys.Single().Keys.RootKeyId);
    }

    private async Task RotateAsync(int replica, RootKey key)
    {
        await _swarm.StopReplicaAsync(replica);
        await _swarm.StartReplicaAsync(replica, key);
    }
}
