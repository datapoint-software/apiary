using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Keys;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Raft;

public sealed class StandaloneClusterTests : IAsyncDisposable
{
    private readonly TemporaryDirectory _directory = new();
    private readonly RootKey _rootKey = RootKey.Generate();
    private readonly int _port = StandaloneReplica.FreePort();
    private readonly List<StandaloneReplica> _replicas = [];

    public async ValueTask DisposeAsync()
    {
        foreach (var replica in _replicas)
        {
            await replica.DisposeAsync();
        }

        _directory.Dispose();
    }

    [Fact]
    public async Task A_first_replica_creates_a_cluster_and_leads_it()
    {
        var replica = await StartAsync();

        Assert.Equal((true, true, true), (replica.Cluster.IsReady, replica.Cluster.IsLeader, replica.Cluster.IsWritable));
    }

    [Fact]
    public async Task Stopping_twice_at_once_stops_the_replica_once()
    {
        var replica = await StartAsync();

        await Task.WhenAll(replica.Cluster.StopAsync(CancellationToken.None), replica.Cluster.StopAsync(CancellationToken.None));
        await replica.Cluster.DisposeAsync();

        Assert.Same(replica.Cluster.StopAsync(CancellationToken.None), replica.Cluster.StopAsync(CancellationToken.None));
    }

    [Fact]
    public async Task A_new_cluster_has_an_id_and_a_ca()
    {
        var state = (await StartAsync()).Cluster.Current;

        Assert.Equal((true, true), (state.ClusterId.HasValue, state.ClusterCa is not null));
    }

    [Fact]
    public async Task A_new_cluster_has_a_default_project()
    {
        var state = (await StartAsync()).Cluster.Current;

        Assert.Equal("Default", state.Projects.Values.Single().Name);
    }

    [Fact]
    public async Task A_new_cluster_registers_its_first_replica()
    {
        var replica = await StartAsync();

        var registered = replica.Cluster.Current.Replicas.Values.Single();

        Assert.Equal((replica.Cluster.Identity?.Id, "node-a", (int?)StateSchema.Current, _rootKey.Id), ((Guid?)registered.Id, registered.Node, registered.Schema, registered.RootKeyId));
    }

    [Fact]
    public async Task A_new_cluster_registers_the_root_key()
    {
        var state = (await StartAsync()).Cluster.Current;

        Assert.Equal(_rootKey.Id, state.RootKeys.Single().Keys.RootKeyId);
    }

    [Fact]
    public async Task A_replica_has_credentials_from_the_cluster_ca()
    {
        var replica = await StartAsync();

        Assert.NotNull(replica.Cluster.Credentials);
    }

    [Fact]
    public async Task An_appended_change_is_applied()
    {
        var replica = await StartAsync();
        var project = AProject();

        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(project)), TestContext.Current.CancellationToken);

        Assert.Equal(project, replica.Cluster.Current.Projects[project.Id]);
    }

    [Fact]
    public async Task An_appended_change_signals_a_change()
    {
        var replica = await StartAsync();
        var token = replica.Cluster.GetChangeToken();

        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(AProject())), TestContext.Current.CancellationToken);

        Assert.True(token.HasChanged);
    }

    [Fact]
    public async Task An_appended_entry_remembers_its_result()
    {
        var replica = await StartAsync();
        var entry = new StateEntry(AnId(), TestClock.Now, [new ProjectSaved(AProject())], "created");

        await replica.Cluster.AppendAsync(entry, TestContext.Current.CancellationToken);

        Assert.Equal("created", replica.Cluster.Current.AppliedRequests[entry.RequestId].Result);
    }

    [Fact]
    public async Task Waiting_for_a_condition_that_holds_returns_at_once()
    {
        var replica = await StartAsync();

        await replica.Cluster.WaitForAsync(state => state.ClusterId is not null, TestContext.Current.CancellationToken);

        Assert.True(replica.Cluster.IsReady);
    }

    [Fact]
    public async Task An_entry_that_needs_a_newer_schema_is_refused()
    {
        var replica = await StartAsync();

        await Assert.ThrowsAsync<ClusterUpgradingException>(() => replica.Cluster.AppendAsync(AnEntry(new NextSchemaChange()), TestContext.Current.CancellationToken).AsTask());
    }

    [Fact]
    public async Task The_state_survives_a_restart()
    {
        var replica = await StartAsync();
        var project = AProject();
        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(project)), TestContext.Current.CancellationToken);
        await replica.StopAsync();

        var restarted = await StartAsync();

        Assert.Equal(project, restarted.Cluster.Current.Projects[project.Id]);
    }

    [Fact]
    public async Task The_cluster_keeps_its_id_after_a_restart()
    {
        var replica = await StartAsync();
        var clusterId = replica.Cluster.Current.ClusterId;
        await replica.StopAsync();

        var restarted = await StartAsync();

        Assert.Equal(clusterId, restarted.Cluster.Current.ClusterId);
    }

    [Fact]
    public async Task The_replica_keeps_its_identity_after_a_restart()
    {
        var replica = await StartAsync();
        var identity = replica.Cluster.Identity?.Id;
        await replica.StopAsync();

        var restarted = await StartAsync();

        Assert.Equal(identity, restarted.Cluster.Identity?.Id);
    }

    [Fact]
    public async Task The_state_survives_a_restart_from_a_snapshot()
    {
        var replica = await StartAsync(snapshotEvery: 2);
        var project = AProject();
        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(AProject("First"))), TestContext.Current.CancellationToken);
        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(AProject("Second"))), TestContext.Current.CancellationToken);
        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(project)), TestContext.Current.CancellationToken);
        await replica.StopAsync();

        var restarted = await StartAsync(snapshotEvery: 2);

        Assert.Equal(project, restarted.Cluster.Current.Projects[project.Id]);
    }

    [Fact]
    public async Task A_standalone_replica_refuses_to_start_with_another_root_key()
    {
        var replica = await StartAsync();
        await replica.StopAsync();

        await Assert.ThrowsAsync<WrongRootKeyException>(() => StandaloneReplica.StartAsync(_directory.Path, RootKey.Generate(), _port));
    }

    [Fact]
    public async Task A_new_data_key_seals_the_state_from_then_on()
    {
        var replica = await StartAsync();
        var key = StateEncryption.NewDataKey(TestClock.Now);

        await replica.Cluster.AppendAsync(AnEntry(new DataKeyAdded(key)), TestContext.Current.CancellationToken);

        Assert.Equal(key.Id, replica.Encryption.Export().Current);
    }

    [Fact]
    public async Task The_state_survives_a_restart_after_a_new_data_key()
    {
        var replica = await StartAsync();
        var project = AProject();
        await replica.Cluster.AppendAsync(AnEntry(new DataKeyAdded(StateEncryption.NewDataKey(TestClock.Now))), TestContext.Current.CancellationToken);
        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(project)), TestContext.Current.CancellationToken);
        await replica.StopAsync();

        var restarted = await StartAsync();

        Assert.Equal(project, restarted.Cluster.Current.Projects[project.Id]);
    }

    [Fact]
    public async Task The_state_at_rest_doesn_t_contain_the_configuration_in_plain_text()
    {
        var replica = await StartAsync();
        await replica.Cluster.AppendAsync(AnEntry(new ProjectSaved(AProject("Unmistakable project name"))), TestContext.Current.CancellationToken);
        await replica.StopAsync();

        var files = Directory.EnumerateFiles(_directory.Path, "*", SearchOption.AllDirectories).Select(File.ReadAllBytes);

        Assert.DoesNotContain(files, bytes => System.Text.Encoding.UTF8.GetString(bytes).Contains("Unmistakable", StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_replica_describes_itself_as_the_only_member_and_leader()
    {
        var replica = await StartAsync();

        var member = replica.Cluster.Describe().Members.Single();

        Assert.Equal((MemberRole.Leader, true, "node-a"), (member.Role, member.Local, member.Node));
    }

    [Fact]
    public async Task A_replica_answers_challenges_from_its_own_state()
    {
        var replica = await StartAsync();
        var challenge = AChallenge();
        await replica.Cluster.AppendAsync(AnEntry(new AcmeChallengesAdded([challenge])), TestContext.Current.CancellationToken);

        Assert.Equal(challenge, await replica.Cluster.FindChallengeAsync(challenge.Token, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_replica_doesn_t_answer_an_unknown_challenge()
    {
        var replica = await StartAsync();

        Assert.Null(await replica.Cluster.FindChallengeAsync("unknown", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_stopped_replica_isn_t_writable()
    {
        var replica = await StartAsync();

        await replica.StopAsync();

        Assert.False(replica.Cluster.IsWritable);
    }

    private async Task<StandaloneReplica> StartAsync(int snapshotEvery = 1000)
    {
        var replica = await StandaloneReplica.StartReadyAsync(_directory.Path, _rootKey, _port, snapshotEvery);
        _replicas.Add(replica);
        return replica;
    }

    [StateSchema(StateSchema.Current + 1)]
    private sealed record NextSchemaChange : IStateChange
    {
        public ApiaryState Apply(ApiaryState state) => state;
    }
}
