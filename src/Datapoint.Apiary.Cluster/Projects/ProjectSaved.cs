using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Projects;

public sealed record ProjectSaved(Project Project) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Projects = state.Projects.SetItem(Project.Id, Project) };
}
