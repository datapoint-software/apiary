using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Replication;

public sealed class FailoverTests : IAsyncLifetime
{
    private SwarmReplicas _swarm = null!;

    public async ValueTask InitializeAsync() => _swarm = await SwarmReplicas.StartAsync(3);

    public async ValueTask DisposeAsync() => await _swarm.DisposeAsync();

    [Fact]
    public async Task When_the_leader_stops_another_replica_leads_and_accepts_changes()
    {
        var old = _swarm.Leader;
        await _swarm.StopReplicaAsync(Slot(old));
        var project = AProject("After the leader left");

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.Count(r => r.Cluster.IsLeader) == 1));
        await _swarm.Leader.SeedAsync(new ProjectSaved(project));

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.All(r => r.State.Projects.ContainsKey(project.Id))));
    }

    [Fact]
    public async Task When_the_leader_is_killed_the_others_elect_a_new_one()
    {
        var old = _swarm.Leader;

        await _swarm.CrashReplicaAsync(Slot(old));

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.Count(r => r.Cluster.IsLeader && r.Cluster.IsWritable) == 1));
    }

    [Fact]
    public async Task A_replica_that_was_killed_catches_up_when_it_comes_back()
    {
        var follower = Slot(_swarm.Followers[0]);
        await _swarm.CrashReplicaAsync(follower);
        var project = AProject("While it was away");
        await _swarm.Leader.SeedAsync(new ProjectSaved(project));

        var back = await _swarm.StartReplicaAsync(follower);

        Assert.True(await Eventually.TrueAsync(() => back.State.Projects.ContainsKey(project.Id)));
    }

    [Fact]
    public async Task A_replica_keeps_its_identity_when_it_comes_back()
    {
        var follower = Slot(_swarm.Followers[0]);
        var identity = _swarm[follower].Cluster.Identity?.Id;
        await _swarm.CrashReplicaAsync(follower);

        var back = await _swarm.StartReplicaAsync(follower);

        Assert.Equal(identity, back.Cluster.Identity?.Id);
    }

    [Fact]
    public async Task Without_a_majority_the_last_replica_stops_accepting_changes()
    {
        var survivor = Slot(_swarm.Followers[0]);
        var others = OtherSlots(survivor);
        await _swarm.CrashReplicaAsync(others[0]);
        await _swarm.CrashReplicaAsync(others[1]);

        Assert.True(await Eventually.TrueAsync(() => !_swarm[survivor].Cluster.IsWritable));
    }

    [Fact]
    public async Task A_cluster_that_lost_its_majority_works_again_when_a_replica_returns()
    {
        var survivor = Slot(_swarm.Followers[0]);
        var others = OtherSlots(survivor);
        await _swarm.CrashReplicaAsync(others[0]);
        await _swarm.CrashReplicaAsync(others[1]);

        await _swarm.StartReplicaAsync(others[0]);

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.Count(r => r.Cluster.IsLeader && r.Cluster.IsWritable) == 1));
    }

    private int Slot(ApiaryApp app) => _swarm.SlotOf(app);

    private int[] OtherSlots(int slot) => _swarm.OtherSlots(slot);
}
