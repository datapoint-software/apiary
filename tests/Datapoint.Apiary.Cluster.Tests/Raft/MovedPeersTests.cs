using System.Net;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Raft;

public sealed class MovedPeersTests
{
    private const string OwnAddress = "10.0.0.1:9444";
    private static readonly IPEndPoint s_own = IPEndPoint.Parse(OwnAddress);
    private static readonly IPEndPoint s_a = IPEndPoint.Parse("10.0.0.2:9444");
    private static readonly IPEndPoint s_b = IPEndPoint.Parse("10.0.0.3:9444");
    private static readonly IPAddress[] s_nothingRunning = [];
    private readonly Replica _self = AReplica("node-1", OwnAddress);
    private readonly Replica _peer = AReplica("node-2", "10.0.0.2:9444");
    private readonly Replica _other = AReplica("node-3", "10.0.0.3:9444");

    private ApiaryState State => ApiaryState.Empty.With(new ReplicaSaved(_self), new ReplicaSaved(_peer), new ReplicaSaved(_other));

    [Fact]
    public void A_replica_a_leader_no_longer_counts_was_removed() =>
        Assert.True(MovedPeers.IsRemoved(AView(_peer.Id, Leader(_peer), new MemberView(null, null, "10.0.0.7:9444", MemberRole.Joining, false, false, null, null)), State, _self.Id, OwnAddress));

    [Fact]
    public void Without_a_view_nothing_says_it_was_removed() =>
        Assert.False(MovedPeers.IsRemoved(null, State, _self.Id, OwnAddress));

    [Fact]
    public void A_replica_without_an_identity_wasn_t_removed() =>
        Assert.False(MovedPeers.IsRemoved(AView(_peer.Id, Leader(_peer)), State, null, OwnAddress));

    [Fact]
    public void A_replica_waiting_to_be_admitted_wasn_t_removed() =>
        Assert.False(MovedPeers.IsRemoved(AView(_peer.Id, Leader(_peer)), ApiaryState.Empty.With(new ReplicaSaved(_peer)), _self.Id, OwnAddress));

    [Fact]
    public void A_peer_without_a_leader_can_t_say_it_was_removed() =>
        Assert.False(MovedPeers.IsRemoved(AView(_peer.Id, Member(_peer, MemberRole.Voter)), State, _self.Id, OwnAddress));

    [Fact]
    public void A_replica_the_leader_lists_at_its_address_wasn_t_removed() =>
        Assert.False(MovedPeers.IsRemoved(AView(_peer.Id, Leader(_peer), new MemberView(null, null, OwnAddress, MemberRole.Voter, true, false, null, null)), State, _self.Id, OwnAddress));

    [Fact]
    public void A_replica_the_leader_lists_by_its_id_wasn_t_removed() =>
        Assert.False(MovedPeers.IsRemoved(AView(_peer.Id, Leader(_peer), Member(_self with { Address = "10.0.0.9:9444" }, MemberRole.Voter)), State, _self.Id, OwnAddress));

    [Fact]
    public void A_peer_at_an_address_the_list_doesn_t_have_moved()
    {
        var moved = MovedPeers.Moved(AView(_peer.Id, Itself(_peer, "10.0.0.8:9444")), State, [s_own, s_a, s_b]);

        Assert.Equal(_peer with { Address = "10.0.0.8:9444" }, moved);
    }

    [Fact]
    public void A_peer_at_an_address_the_list_has_didn_t_move() =>
        Assert.Null(MovedPeers.Moved(AView(_peer.Id, Itself(_peer, _peer.Address)), State, [s_own, s_a, s_b]));

    [Fact]
    public void Without_a_view_no_peer_moved() =>
        Assert.Null(MovedPeers.Moved(null, State, [s_own, s_a, s_b]));

    [Fact]
    public void A_peer_that_doesn_t_say_who_it_is_didn_t_move() =>
        Assert.Null(MovedPeers.Moved(AView(null, Itself(_peer, "10.0.0.8:9444")), State, [s_own, s_a, s_b]));

    [Fact]
    public void A_peer_that_doesn_t_list_itself_didn_t_move() =>
        Assert.Null(MovedPeers.Moved(AView(_peer.Id, Leader(_other)), State, [s_own, s_a, s_b]));

    [Fact]
    public void A_peer_the_state_doesn_t_know_didn_t_move() =>
        Assert.Null(MovedPeers.Moved(AView(AnId(), Itself(_peer, "10.0.0.8:9444")), State, [s_own, s_a, s_b]));

    [Fact]
    public void A_peer_at_an_address_that_isn_t_one_didn_t_move() =>
        Assert.Null(MovedPeers.Moved(AView(_peer.Id, Itself(_peer, "somewhere")), State, [s_own, s_a, s_b]));

    [Fact]
    public void A_peer_s_former_address_is_the_one_the_state_has() =>
        Assert.Equal(s_a, MovedPeers.FormerAddress(_peer.Id, State, NoHistory, [s_a, s_b]));

    [Fact]
    public void A_peer_s_former_address_can_come_from_the_history()
    {
        var history = NoHistory.With([new KnownAddress(s_b.ToString(), _peer.Id, TestClock.Now)]);

        Assert.Equal(s_b, MovedPeers.FormerAddress(_peer.Id, ApiaryState.Empty, history, [s_a, s_b]));
    }

    [Fact]
    public void A_peer_with_no_known_address_has_no_former_one() =>
        Assert.Null(MovedPeers.FormerAddress(AnId(), State, NoHistory, [s_a, s_b]));

    [Fact]
    public void A_moved_peer_replaces_its_own_former_address()
    {
        var moved = _peer with { Address = "10.0.0.8:9444" };

        var moves = MovedPeers.Pair([moved], State, NoHistory, [s_a, s_b], s_nothingRunning);

        Assert.Equal(moved, Assert.Single(moves, m => m.Key.Equals(s_a)).Value);
        Assert.Single(moves);
    }

    [Fact]
    public void A_moved_peer_with_no_known_address_replaces_one_no_running_task_has()
    {
        var stranger = AReplica("node-4", "10.0.0.8:9444");

        var moves = MovedPeers.Pair([stranger], State, NoHistory, [s_a, s_b], [s_a.Address]);

        Assert.Equal(s_b, Assert.Single(moves).Key);
    }

    [Fact]
    public void An_address_a_running_task_has_isn_t_replaced()
    {
        var stranger = AReplica("node-4", "10.0.0.8:9444");

        var moves = MovedPeers.Pair([stranger], State, NoHistory, [s_a, s_b], [s_a.Address, s_b.Address]);

        Assert.Empty(moves);
    }

    [Fact]
    public void An_address_a_moved_peer_took_back_isn_t_given_to_another()
    {
        var moved = _peer with { Address = "10.0.0.8:9444" };
        var stranger = AReplica("node-4", "10.0.0.9:9444");

        var moves = MovedPeers.Pair([moved, stranger], State, NoHistory, [s_a, s_b], s_nothingRunning);

        Assert.Equal(moved, moves[s_a]);
        Assert.Equal(stranger, moves[s_b]);
    }

    [Fact]
    public void Moved_peers_never_add_members()
    {
        var strangers = new[] { AReplica("node-4", "10.0.0.8:9444"), AReplica("node-5", "10.0.0.9:9444") };

        var moves = MovedPeers.Pair(strangers, ApiaryState.Empty, NoHistory, [s_a], s_nothingRunning);

        Assert.Equal(s_a, Assert.Single(moves).Key);
    }

    private static AddressHistory NoHistory => new([]);

    private static ClusterView AView(Guid? replicaId, params MemberView[] members) =>
        new("Swarm", false, false, 0, replicaId, members, new MembershipSettings(MembershipMode.Automatic, 5), []);

    private static MemberView Leader(Replica replica) => Member(replica, MemberRole.Leader);

    private static MemberView Member(Replica replica, MemberRole role) =>
        new(replica.Id, replica.Node, replica.Address, role, true, false, null, null);

    private static MemberView Itself(Replica replica, string address) =>
        new(replica.Id, replica.Node, address, MemberRole.Voter, true, true, null, null);
}
