using Datapoint.Apiary.Cluster.Recovery;
using static Datapoint.Apiary.Testing.Builders.RecoveryBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Recovery;

public sealed class RecoveryPlanTests
{
    [Fact]
    public void A_replica_in_Swarm_without_a_majority_needs_recovering() =>
        Assert.True(RecoveryPlan.IsNeeded(inSwarm: true, hasState: true, writable: false, [ASurvivor(index: 9)]));

    [Fact]
    public void A_replica_that_can_write_doesn_t_need_recovering() =>
        Assert.False(RecoveryPlan.IsNeeded(inSwarm: true, hasState: true, writable: true, []));

    [Fact]
    public void A_replica_cut_off_from_a_cluster_with_a_majority_doesn_t_recover() =>
        Assert.False(RecoveryPlan.IsNeeded(inSwarm: true, hasState: true, writable: false, [ASurvivor(index: 9), ASurvivor(index: 9, node: "node-c", writable: true)]));

    [Fact]
    public void A_replica_without_state_has_nothing_to_recover_from() =>
        Assert.False(RecoveryPlan.IsNeeded(inSwarm: true, hasState: false, writable: false, []));

    [Fact]
    public void A_standalone_replica_never_recovers() =>
        Assert.False(RecoveryPlan.IsNeeded(inSwarm: false, hasState: true, writable: false, []));

    [Fact]
    public void A_replica_cut_off_names_the_one_with_the_majority() =>
        Assert.Equal("node-c", (ARecoveryPlan() with { Survivors = [ASurvivor(index: 9), ASurvivor(index: 9, node: "node-c", writable: true)] }).MajorityElsewhere?.Node);

    [Fact]
    public void A_replica_that_can_write_isn_t_cut_off() =>
        Assert.Null((ARecoveryPlan() with { Writable = true, Survivors = [ASurvivor(index: 9, writable: true)] }).MajorityElsewhere);
}
