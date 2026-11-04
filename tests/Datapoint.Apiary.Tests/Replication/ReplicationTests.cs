using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Replication;

public sealed class ReplicationTests : IAsyncLifetime
{
    private SwarmReplicas _swarm = null!;

    public async ValueTask InitializeAsync() => _swarm = await SwarmReplicas.StartAsync(3);

    public async ValueTask DisposeAsync() => await _swarm.DisposeAsync();

    [Fact]
    public void Three_replicas_form_one_cluster_with_one_leader()
    {
        Assert.Equal(2, _swarm.Followers.Count);
        Assert.Equal(3, _swarm.Leader.State.Replicas.Count);
    }

    [Fact]
    public void Every_replica_shares_the_same_cluster_id()
    {
        Assert.Single(_swarm.Running.Select(r => r.State.ClusterId).Distinct());
    }

    [Fact]
    public async Task A_change_on_the_leader_reaches_every_replica()
    {
        var project = AProject("Replicated");

        await _swarm.Leader.SeedAsync(new ProjectSaved(project));

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.All(r => r.State.Projects.ContainsKey(project.Id))));
    }

    [Fact]
    public async Task A_change_on_a_follower_is_sent_to_the_leader_and_reaches_every_replica()
    {
        var project = AProject("From a follower");

        await _swarm.Followers[0].SeedAsync(new ProjectSaved(project));

        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.All(r => r.State.Projects.ContainsKey(project.Id))));
    }

    [Fact]
    public async Task An_action_on_a_follower_s_admin_api_is_forwarded_to_the_leader()
    {
        var follower = _swarm.Followers[0];
        using var client = await AdminSession.SignedInAsync(follower);

        var created = await AdminSession.PostAsync(client, "projects/create", new JsonObject { ["name"] = "Forwarded" });

        var id = Guid.Parse(created.GetValue<string>());
        Assert.True(await Eventually.TrueAsync(() => _swarm.Running.All(r => r.State.Projects.ContainsKey(id))));
    }

    [Fact]
    public async Task A_follower_describes_the_cluster_as_the_leader_sees_it_from_its_own_place()
    {
        var follower = _swarm.Followers[0];

        var view = await follower.Cluster.DescribeAsync(TestContext.Current.CancellationToken);

        Assert.Equal(3, view.Members.Count(m => m.Reachable));
        Assert.Equal(follower.Cluster.Address?.ToString(), view.Members.Single(m => m.Local).Address);
    }
}
