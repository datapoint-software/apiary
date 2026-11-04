using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing.Builders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Projects;

public sealed class ProjectChangesTests
{
    [Fact]
    public void Saving_a_project_adds_it()
    {
        var project = AProject();

        var state = ApiaryState.Empty.With(new ProjectSaved(project));

        Assert.Equal(project, state.Projects[project.Id]);
    }

    [Fact]
    public void Saving_a_project_again_replaces_it()
    {
        var project = AProject();

        var state = ApiaryState.Empty.With(new ProjectSaved(project), new ProjectSaved(project with { Name = "Store" }));

        Assert.Equal("Store", state.Projects[project.Id].Name);
    }

    [Fact]
    public void Deleting_a_project_removes_it()
    {
        var project = AProject();

        var state = ApiaryState.Empty.With(new ProjectSaved(project), new ProjectDeleted(project.Id));

        Assert.Empty(state.Projects);
    }

    [Fact]
    public void Deleting_a_project_that_doesn_t_exist_changes_nothing()
    {
        var state = ApiaryState.Empty.With(new ProjectSaved(AProject()));

        var after = state.With(new ProjectDeleted(AnId()));

        Assert.Equal(state.Projects, after.Projects);
    }
}
