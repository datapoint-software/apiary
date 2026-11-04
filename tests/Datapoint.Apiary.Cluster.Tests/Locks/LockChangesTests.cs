using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Locks;

public sealed class LockChangesTests
{
    [Fact]
    public void A_free_lock_can_be_taken()
    {
        var taken = ALock();

        var state = ApiaryState.Empty.With(new LockTaken(taken, TestClock.Now));

        Assert.Same(taken, state.Locks[taken.Name]);
    }

    [Fact]
    public void A_lock_held_by_another_holder_can_t_be_taken_before_it_expires()
    {
        var held = ALock(holder: "replica-a");

        var state = ApiaryState.Empty.With(new LockTaken(held, TestClock.Now), new LockTaken(ALock(holder: "replica-b"), TestClock.Now));

        Assert.Equal("replica-a", state.Locks[held.Name].Holder);
    }

    [Fact]
    public void An_expired_lock_can_be_taken_by_another_holder()
    {
        var expired = ALock(holder: "replica-a", expiresAt: TestClock.Now);

        var state = ApiaryState.Empty.With(new LockTaken(expired, TestClock.Now.AddMinutes(-1)), new LockTaken(ALock(holder: "replica-b"), TestClock.Now));

        Assert.Equal("replica-b", state.Locks[expired.Name].Holder);
    }

    [Fact]
    public void Its_holder_can_extend_a_lock()
    {
        var extended = ALock(expiresAt: TestClock.Now.AddMinutes(5));

        var state = ApiaryState.Empty.With(new LockTaken(ALock(), TestClock.Now), new LockTaken(extended, TestClock.Now));

        Assert.Equal(extended.ExpiresAt, state.Locks[extended.Name].ExpiresAt);
    }

    [Fact]
    public void Its_holder_can_release_a_lock()
    {
        var held = ALock(holder: "replica-a");

        var state = ApiaryState.Empty.With(new LockTaken(held, TestClock.Now), new LockReleased(held.Name, "replica-a"));

        Assert.Empty(state.Locks);
    }

    [Fact]
    public void Another_holder_can_t_release_a_lock()
    {
        var held = ALock(holder: "replica-a");

        var state = ApiaryState.Empty.With(new LockTaken(held, TestClock.Now), new LockReleased(held.Name, "replica-b"));

        Assert.Same(held, state.Locks[held.Name]);
    }

    [Fact]
    public void Releasing_a_lock_nobody_holds_changes_nothing()
    {
        var state = ApiaryState.Empty;

        Assert.Same(state, state.With(new LockReleased("certificates", "replica-a")));
    }
}
