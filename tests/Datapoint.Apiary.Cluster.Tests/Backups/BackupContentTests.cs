using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Backups;

public sealed class BackupContentTests
{
    private static readonly ClusterCa s_ca = new("ca-pem", "ca-key", TestClock.Now.AddYears(2));

    [Fact]
    public void A_backup_records_the_cluster_and_index_it_was_taken_from()
    {
        var clusterId = AnId();
        var state = AnEntry(new ClusterCreated(clusterId, s_ca)).ApplyTo(ApiaryState.Empty, 42);

        var content = BackupContent.From(state, TestClock.Now);

        Assert.Equal((BackupContent.CurrentVersion, TestClock.Now, clusterId, 42L), (content.Version, content.TakenAt, content.ClusterId, content.Index));
    }

    [Fact]
    public void A_backup_keeps_the_configuration()
    {
        var project = AProject();

        var content = BackupContent.From(ApiaryState.Empty.With(new ProjectSaved(project)), TestClock.Now);

        Assert.Equal([project.Id], content.State.Projects.Keys);
    }

    [Fact]
    public void A_backup_leaves_out_sessions_agents_locks_and_challenges()
    {
        var userId = AnId();
        var state = ApiaryState.Empty.With(new SessionStarted(ASession(userId)), new AgentSaved(AnAgent(userId)), new LockTaken(ALock(), TestClock.Now), new AcmeChallengesAdded([AChallenge()]));

        var content = BackupContent.From(state, TestClock.Now);

        Assert.Equal((0, 0, 0, 0), (content.State.Sessions.Count, content.State.Agents.Count, content.State.Locks.Count, content.State.AcmeChallenges.Count));
    }

    [Fact]
    public void A_backup_leaves_out_the_replicas_the_cluster_ca_and_the_last_backup()
    {
        var state = ApiaryState.Empty.With(new ClusterCreated(AnId(), s_ca), new ReplicaSaved(AReplica()), new BackupExported(new LastBackup(TestClock.Now, null, 1)));

        var content = BackupContent.From(state, TestClock.Now);

        Assert.Equal((0, (ClusterCa?)null, (LastBackup?)null), (content.State.Replicas.Count, content.State.ClusterCa, content.State.LastBackup));
    }

    [Fact]
    public void A_backup_leaves_out_applied_requests()
    {
        var state = AnEntry(new ProjectSaved(AProject())).ApplyTo(ApiaryState.Empty, 1);

        Assert.Empty(BackupContent.From(state, TestClock.Now).State.AppliedRequests);
    }
}
