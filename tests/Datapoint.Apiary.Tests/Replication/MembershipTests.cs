using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;

namespace Datapoint.Apiary.Tests.Replication;

public sealed class MembershipTests : IAsyncLifetime
{
    private static readonly TimeSpan s_monitorCycles = TimeSpan.FromSeconds(60);
    private SwarmReplicas _swarm = null!;

    public async ValueTask InitializeAsync() =>
        _swarm = await SwarmReplicas.StartAsync(3, new Dictionary<string, string>(StringComparer.Ordinal) { ["Apiary:MissingTimeout"] = "00:00:01" });

    public async ValueTask DisposeAsync() => await _swarm.DisposeAsync();

    [Fact]
    public async Task A_new_replica_joins_on_its_own_in_automatic_mode()
    {
        var fourth = await _swarm.StartReplicaAsync(4);

        Assert.True(await Eventually.TrueAsync(() => _swarm.Leader.State.Replicas.ContainsKey(fourth.Cluster.Identity!.Id)));
    }

    [Fact]
    public async Task In_manual_mode_a_new_replica_waits_for_an_administrator()
    {
        using var client = await AdminSession.SignedInAsync(_swarm.Leader);
        await AdminSession.PostAsync(client, "cluster/update-membership", new JsonObject { ["mode"] = "Manual", ["removeMissingAfterMinutes"] = 30 });

        var fourth = _swarm.Launch(4);

        Assert.True(await Eventually.TrueAsync(() => _swarm.Leader.Cluster.Pending.Count == 1, s_monitorCycles));
        Assert.False(fourth.Cluster.IsReady);
    }

    [Fact]
    public async Task An_approved_replica_joins_in_manual_mode()
    {
        using var client = await AdminSession.SignedInAsync(_swarm.Leader);
        await AdminSession.PostAsync(client, "cluster/update-membership", new JsonObject { ["mode"] = "Manual", ["removeMissingAfterMinutes"] = 30 });
        var fourth = _swarm.Launch(4);
        Assert.True(await Eventually.TrueAsync(() => _swarm.Leader.Cluster.Pending.Count == 1, s_monitorCycles));

        await AdminSession.PostAsync(client, "cluster/approve-replica", new JsonObject { ["id"] = _swarm.Leader.Cluster.Pending[0].Id });

        Assert.True(await Eventually.TrueAsync(() => fourth.Cluster.IsReady && _swarm.Leader.State.Replicas.Count == 4, s_monitorCycles));
    }

    [Fact]
    public async Task A_replica_that_stops_leaves_the_cluster()
    {
        var follower = _swarm.SlotOf(_swarm.Followers[0]);

        await _swarm.StopReplicaAsync(follower);

        Assert.Equal(2, _swarm.Leader.State.Replicas.Count);
    }

    [Fact]
    public async Task A_replica_that_can_still_be_reached_can_t_be_removed()
    {
        using var client = await AdminSession.SignedInAsync(_swarm.Leader);
        var id = _swarm.Followers[0].Cluster.Identity!.Id;

        using var response = await client.PostAsJsonAsync(new Uri("/api/cluster/remove-replica", UriKind.Relative), new JsonObject { ["id"] = id }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task An_administrator_removes_a_replica_that_can_t_be_reached()
    {
        using var client = await AdminSession.SignedInAsync(_swarm.Leader);
        var follower = _swarm.Followers[0];
        var id = follower.Cluster.Identity!.Id;
        await _swarm.CrashReplicaAsync(_swarm.SlotOf(follower));
        Assert.True(await Eventually.TrueAsync(() => !_swarm.Leader.Cluster.IsReachable(_swarm.Leader.State.Replicas[id]), s_monitorCycles));

        await AdminSession.PostAsync(client, "cluster/remove-replica", new JsonObject { ["id"] = id });

        Assert.False(_swarm.Leader.State.Replicas.ContainsKey(id));
    }

    [Fact]
    public async Task A_replica_missing_for_longer_than_the_timeout_is_removed()
    {
        var follower = _swarm.Followers[0];
        var id = follower.Cluster.Identity!.Id;

        await _swarm.CrashReplicaAsync(_swarm.SlotOf(follower));

        Assert.True(await Eventually.TrueAsync(() => !_swarm.Leader.State.Replicas.ContainsKey(id), s_monitorCycles));
    }
}
