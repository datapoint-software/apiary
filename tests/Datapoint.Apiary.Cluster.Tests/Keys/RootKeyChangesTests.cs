using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Keys;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Keys;

public sealed class RootKeyChangesTests
{
    [Fact]
    public void Registering_a_root_key_adds_it()
    {
        var keys = new JoinKeys("root-1", "mac", "transport");

        var state = ApiaryState.Empty.With(new RootKeyRegistered(keys, TestClock.Now));

        Assert.Equal([new RegisteredRootKey(keys, TestClock.Now)], state.RootKeys);
    }

    [Fact]
    public void Registering_a_root_key_again_keeps_the_first_registration()
    {
        var keys = new JoinKeys("root-1", "mac", "transport");

        var state = ApiaryState.Empty.With(new RootKeyRegistered(keys, TestClock.Now), new RootKeyRegistered(keys, TestClock.Now.AddDays(1)));

        Assert.Equal([TestClock.Now], state.RootKeys.Select(k => k.AddedAt));
    }

    [Fact]
    public void Forgetting_root_keys_keeps_only_the_named_one()
    {
        var state = ApiaryState.Empty.With(
            new RootKeyRegistered(new JoinKeys("root-1", "mac", "transport"), TestClock.Now),
            new RootKeyRegistered(new JoinKeys("root-2", "mac", "transport"), TestClock.Now),
            new RootKeysForgotten("root-2"));

        Assert.Equal(["root-2"], state.RootKeys.Select(k => k.Keys.RootKeyId));
    }

    [Fact]
    public void Adding_a_data_key_leaves_the_state_as_it_was()
    {
        var state = ApiaryState.Empty.With(new ProjectSaved(AProject()));

        Assert.Same(state, state.With(new DataKeyAdded(StateEncryption.NewDataKey(TestClock.Now))));
    }
}
