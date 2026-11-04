using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;

namespace Datapoint.Apiary.Tests.Replication;

public sealed class RecoveryTests : IAsyncLifetime
{
    private static readonly TimeSpan s_restart = TimeSpan.FromSeconds(60);
    private SwarmReplicas _swarm = null!;
    private int _survivor;
    private HttpClient _client = null!;

    public async ValueTask InitializeAsync()
    {
        _swarm = await SwarmReplicas.StartAsync(3);
        _survivor = _swarm.SlotOf(_swarm.Followers[0]);
        _client = await AdminSession.SignedInAsync(_swarm[_survivor]);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _swarm.DisposeAsync();
    }

    [Fact]
    public async Task A_cluster_with_a_majority_needs_no_recovery()
    {
        var plan = await _swarm[_survivor].Cluster.PlanRecoveryAsync(TestContext.Current.CancellationToken);

        Assert.False(plan.Needed);
    }

    [Fact]
    public async Task A_cluster_with_a_majority_refuses_to_recover()
    {
        using var response = await RecoverAsync(await AdminSession.NextCodeAsync());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("cluster.recoveryNotNeeded", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_wrong_code_doesn_t_start_a_recovery()
    {
        await LoseMajorityAsync();

        using var response = await RecoverAsync("000000");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task The_last_replica_plans_a_recovery_naming_the_lost_ones()
    {
        await LoseMajorityAsync();

        var plan = await _swarm[_survivor].Cluster.PlanRecoveryAsync(TestContext.Current.CancellationToken);

        Assert.True(plan.Needed);
        Assert.Equal(2, plan.Unreachable.Count);
    }

    [Fact]
    public async Task Recovering_makes_the_last_replica_the_only_member_of_a_new_cluster()
    {
        var before = _swarm[_survivor].State.ClusterId;
        await LoseMajorityAsync();

        using var response = await RecoverAsync(await AdminSession.NextCodeAsync());
        var recovered = await RestartSurvivorAsync();

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.True(recovered.Cluster.IsWritable);
        Assert.NotEqual(before, recovered.State.ClusterId);
        Assert.Contains(before!.Value, recovered.State.PreviousClusterIds);
        Assert.Single(recovered.State.Replicas);
    }

    [Fact]
    public async Task A_replica_of_the_old_cluster_sets_its_state_aside_when_it_returns()
    {
        await LoseMajorityAsync();
        using var response = await RecoverAsync(await AdminSession.NextCodeAsync());
        await RestartSurvivorAsync();
        var lost = LostSlots()[0];

        _swarm.Launch(lost);

        Assert.True(await Eventually.TrueAsync(() => Directory.EnumerateDirectories(_swarm.DataDirectoryOf(lost), "superseded-*").Any(), s_restart));
    }

    private int[] LostSlots() => [.. Enumerable.Range(1, 3).Where(n => n != _survivor)];

    private async Task LoseMajorityAsync()
    {
        var lost = LostSlots();
        await _swarm.CrashReplicaAsync(lost[0]);
        await _swarm.CrashReplicaAsync(lost[1]);
        Assert.True(await Eventually.TrueAsync(() => !_swarm[_survivor].Cluster.IsWritable, s_restart));
    }

    private async Task<HttpResponseMessage> RecoverAsync(string code) =>
        await _client.PostAsJsonAsync(
            new Uri("/api/cluster/recover", UriKind.Relative),
            new JsonObject { ["node"] = $"node-{_survivor}", ["password"] = AdminSession.Password, ["code"] = code },
            TestContext.Current.CancellationToken);

    private async Task<ApiaryApp> RestartSurvivorAsync()
    {
        await _swarm.StopReplicaAsync(_survivor);
        return await _swarm.StartReplicaAsync(_survivor);
    }
}
