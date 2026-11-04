using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.State;

public sealed class StateSchemaTests
{
    [Fact]
    public void A_change_without_a_schema_needs_the_first_schema() =>
        Assert.Equal(1, StateSchema.Required(AnEntry(new ProjectSaved(AProject()))));

    [Fact]
    public void An_entry_without_changes_needs_the_first_schema() =>
        Assert.Equal(1, StateSchema.Required(AnEntry()));

    [Fact]
    public void An_entry_needs_the_highest_schema_of_its_changes() =>
        Assert.Equal(2, StateSchema.Required(AnEntry(new ProjectSaved(AProject()), new SecondSchemaChange())));

    [Fact]
    public void A_cluster_without_replicas_supports_the_current_schema() =>
        Assert.Equal(StateSchema.Current, StateSchema.Supported(ApiaryState.Empty));

    [Fact]
    public void A_cluster_supports_the_lowest_schema_of_its_replicas()
    {
        var state = ApiaryState.Empty.With(new ReplicaSaved(AReplica(schema: 3)), new ReplicaSaved(AReplica(schema: 2)));

        Assert.Equal(2, StateSchema.Supported(state));
    }

    [Fact]
    public void A_replica_that_didn_t_say_supports_the_first_schema()
    {
        var state = ApiaryState.Empty.With(new ReplicaSaved(AReplica(schema: 3)), new ReplicaSaved(AReplica()));

        Assert.Equal(1, StateSchema.Supported(state));
    }

    [StateSchema(2)]
    private sealed record SecondSchemaChange : IStateChange
    {
        public ApiaryState Apply(ApiaryState state) => state;
    }
}
