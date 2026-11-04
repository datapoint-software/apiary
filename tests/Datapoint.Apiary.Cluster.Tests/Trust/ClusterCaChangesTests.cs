using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Trust;

public sealed class ClusterCaChangesTests
{
    private static readonly ClusterCa s_current = new("current-pem", "current-key", TestClock.Now.AddDays(100));
    private static readonly ClusterCa s_next = new("next-pem", "next-key", TestClock.Now.AddYears(2));
    private static readonly ApiaryState s_cluster = ApiaryState.Empty.With(new ClusterCreated(AnId(), s_current));

    [Fact]
    public void Adding_a_ca_makes_it_the_next_one()
    {
        var state = s_cluster.With(new ClusterCaAdded(s_next, TestClock.Now));

        Assert.Equal((s_current, s_next, TestClock.Now), (state.ClusterCa, state.NextClusterCa, state.ClusterCaChangedAt));
    }

    [Fact]
    public void A_ca_can_t_be_added_while_another_is_next()
    {
        var state = s_cluster.With(new ClusterCaAdded(s_next, TestClock.Now), new ClusterCaAdded(s_next with { KeyPem = "other" }, TestClock.Now.AddHours(1)));

        Assert.Equal((s_next, TestClock.Now), (state.NextClusterCa, state.ClusterCaChangedAt));
    }

    [Fact]
    public void Promoting_makes_the_next_ca_current_and_retires_the_old_one()
    {
        var promotedAt = TestClock.Now.AddDays(1);

        var state = s_cluster.With(new ClusterCaAdded(s_next, TestClock.Now), new ClusterCaPromoted(promotedAt));

        Assert.Equal((s_next, (ClusterCa?)null, s_current, promotedAt), (state.ClusterCa, state.NextClusterCa, state.RetiringClusterCa, state.ClusterCaChangedAt));
    }

    [Fact]
    public void Promoting_without_a_next_ca_changes_nothing() =>
        Assert.Same(s_cluster, s_cluster.With(new ClusterCaPromoted(TestClock.Now)));

    [Fact]
    public void Retiring_forgets_the_old_ca()
    {
        var retiredAt = TestClock.Now.AddDays(2);

        var state = s_cluster.With(new ClusterCaAdded(s_next, TestClock.Now), new ClusterCaPromoted(TestClock.Now.AddDays(1)), new ClusterCaRetired(retiredAt));

        Assert.Equal((s_next, (ClusterCa?)null, retiredAt), (state.ClusterCa, state.RetiringClusterCa, state.ClusterCaChangedAt));
    }
}
