using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Replicas;

public sealed class ReplicaChangesTests
{
    private static readonly ClusterCa s_ca = new("ca-pem", "ca-key-pem", TestClock.Now.AddYears(2));

    [Fact]
    public void Creating_the_cluster_sets_its_id_and_ca()
    {
        var id = AnId();

        var state = ApiaryState.Empty.With(new ClusterCreated(id, s_ca));

        Assert.Equal((id, s_ca), (state.ClusterId, state.ClusterCa));
    }

    [Fact]
    public void A_cluster_can_t_be_created_twice()
    {
        var first = AnId();

        var state = ApiaryState.Empty.With(new ClusterCreated(first, s_ca), new ClusterCreated(AnId(), s_ca with { KeyPem = "other" }));

        Assert.Equal((first, s_ca), (state.ClusterId, state.ClusterCa));
    }

    [Fact]
    public void Saving_a_replica_adds_it()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaSaved(replica));

        Assert.Same(replica, state.Replicas[replica.Id]);
    }

    [Fact]
    public void Saving_a_replica_uses_up_its_approval()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaApproved(replica.Id), new ReplicaSaved(replica));

        Assert.Empty(state.ApprovedReplicas);
    }

    [Fact]
    public void Approving_a_replica_lets_it_join()
    {
        var id = AnId();

        var state = ApiaryState.Empty.With(new ReplicaApproved(id));

        Assert.Contains(id, state.ApprovedReplicas);
    }

    [Fact]
    public void A_replica_that_leaves_is_removed()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaSaved(replica), new ReplicaLeft(replica.Id));

        Assert.Empty(state.Replicas);
    }

    [Fact]
    public void A_replica_that_leaves_may_join_again_without_approval()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaSaved(replica), new ReplicaLeft(replica.Id));

        Assert.Contains(replica.Id, state.ApprovedReplicas);
    }

    [Fact]
    public void Removing_a_replica_removes_it()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaSaved(replica), new ReplicaRemoved(replica.Id, TestClock.Now));

        Assert.Empty(state.Replicas);
    }

    [Fact]
    public void Removing_a_replica_remembers_when()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaSaved(replica), new ReplicaRemoved(replica.Id, TestClock.Now));

        Assert.Equal(TestClock.Now, state.RemovedReplicas[replica.Id]);
    }

    [Fact]
    public void Removing_a_replica_without_a_time_remembers_nothing()
    {
        var replica = AReplica();

        var state = ApiaryState.Empty.With(new ReplicaSaved(replica), new ReplicaRemoved(replica.Id));

        Assert.Empty(state.RemovedReplicas);
    }

    [Fact]
    public void Removed_replicas_are_forgotten_once_their_certificates_have_expired()
    {
        var old = AnId();
        var later = TestClock.Now + ClusterAuthority.ReplicaLifetime + TimeSpan.FromMinutes(1);

        var state = ApiaryState.Empty.With(new ReplicaRemoved(old, TestClock.Now), new ReplicaRemoved(AnId(), later));

        Assert.DoesNotContain(old, state.RemovedReplicas.Keys);
    }

    [Fact]
    public void Removed_replicas_are_remembered_while_their_certificates_may_be_valid()
    {
        var recent = AnId();
        var later = TestClock.Now + ClusterAuthority.ReplicaLifetime;

        var state = ApiaryState.Empty.With(new ReplicaRemoved(recent, TestClock.Now), new ReplicaRemoved(AnId(), later));

        Assert.Contains(recent, state.RemovedReplicas.Keys);
    }

    [Fact]
    public void Changing_membership_replaces_the_settings()
    {
        var membership = new MembershipSettings(MembershipMode.Manual, 10);

        var state = ApiaryState.Empty.With(new MembershipChanged(membership));

        Assert.Equal(membership, state.Membership);
    }

    [Fact]
    public void Recovering_the_cluster_gives_it_a_new_id()
    {
        var recovered = AnId();

        var state = ApiaryState.Empty.With(new ClusterCreated(AnId(), s_ca), new ClusterRecovered(recovered, s_ca, AReplica()));

        Assert.Equal(recovered, state.ClusterId);
    }

    [Fact]
    public void Recovering_the_cluster_remembers_its_previous_id()
    {
        var previous = AnId();

        var state = ApiaryState.Empty.With(new ClusterCreated(previous, s_ca), new ClusterRecovered(AnId(), s_ca, AReplica()));

        Assert.Equal([previous], state.PreviousClusterIds);
    }

    [Fact]
    public void Recovering_a_cluster_that_had_no_id_remembers_none() =>
        Assert.Empty(ApiaryState.Empty.With(new ClusterRecovered(AnId(), s_ca, AReplica())).PreviousClusterIds);

    [Fact]
    public void Recovering_the_cluster_keeps_only_the_survivor()
    {
        var survivor = AReplica("node-a");

        var state = ApiaryState.Empty.With(new ReplicaSaved(AReplica("node-b")), new ReplicaSaved(AReplica("node-c")), new ClusterRecovered(AnId(), s_ca, survivor));

        Assert.Equal([survivor.Id], state.Replicas.Keys);
    }

    [Fact]
    public void Recovering_the_cluster_cancels_a_ca_rotation()
    {
        var rotating = ApiaryState.Empty.With(new ClusterCreated(AnId(), s_ca), new ClusterCaAdded(s_ca with { KeyPem = "next" }, TestClock.Now));

        var state = rotating.With(new ClusterRecovered(AnId(), s_ca, AReplica()));

        Assert.Equal((null, null, null), (state.NextClusterCa, state.RetiringClusterCa, state.ClusterCaChangedAt));
    }

    [Fact]
    public void Recovering_the_cluster_ends_sessions_agents_locks_and_challenges()
    {
        var userId = AnId();
        var state = ApiaryState.Empty.With(new SessionStarted(ASession(userId)), new AgentSaved(AnAgent(userId)), new LockTaken(ALock(), TestClock.Now), new AcmeChallengesAdded([AChallenge()]));

        var recovered = state.With(new ClusterRecovered(AnId(), s_ca, AReplica()));

        Assert.Equal((0, 0, 0, 0), (recovered.Sessions.Count, recovered.Agents.Count, recovered.Locks.Count, recovered.AcmeChallenges.Count));
    }

    [Fact]
    public void Recovering_the_cluster_forgets_applied_requests()
    {
        var state = AnEntry(new ProjectSaved(AProject())).ApplyTo(ApiaryState.Empty, 1);

        var recovered = state.With(new ClusterRecovered(AnId(), s_ca, AReplica()));

        Assert.Empty(recovered.AppliedRequests);
    }
}
