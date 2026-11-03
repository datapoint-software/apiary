using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Projects;

public sealed record ProjectDeleted(Guid Id) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Projects = state.Projects.Remove(Id) };
}
