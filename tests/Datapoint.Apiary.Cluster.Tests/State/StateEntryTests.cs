using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.State;

public sealed class StateEntryTests
{
    [Fact]
    public void Applying_an_entry_applies_its_changes_in_order()
    {
        var project = AProject();

        var state = AnEntry(new ProjectSaved(project), new ProjectSaved(project with { Name = "Store" })).ApplyTo(ApiaryState.Empty, 1);

        Assert.Equal("Store", state.Projects[project.Id].Name);
    }

    [Fact]
    public void Applying_an_entry_sets_the_index() =>
        Assert.Equal(7, AnEntry().ApplyTo(ApiaryState.Empty, 7).Index);

    [Fact]
    public void Applying_an_entry_remembers_its_request_and_result()
    {
        var entry = new StateEntry(AnId(), TestClock.Now, [], "created");

        var state = entry.ApplyTo(ApiaryState.Empty, 1);

        Assert.Equal(new AppliedRequest(TestClock.Now, "created"), state.AppliedRequests[entry.RequestId]);
    }

    [Fact]
    public void Requests_are_remembered_for_10_minutes()
    {
        var first = new StateEntry(AnId(), TestClock.Now, []);
        var later = new StateEntry(AnId(), TestClock.Now + StateEntry.RequestMemory, []);

        var state = later.ApplyTo(first.ApplyTo(ApiaryState.Empty, 1), 2);

        Assert.Contains(first.RequestId, state.AppliedRequests.Keys);
    }

    [Fact]
    public void Requests_are_forgotten_after_10_minutes()
    {
        var first = new StateEntry(AnId(), TestClock.Now, []);
        var later = new StateEntry(AnId(), TestClock.Now + StateEntry.RequestMemory + TimeSpan.FromSeconds(1), []);

        var state = later.ApplyTo(first.ApplyTo(ApiaryState.Empty, 1), 2);

        Assert.Equal([later.RequestId], state.AppliedRequests.Keys);
    }
}
