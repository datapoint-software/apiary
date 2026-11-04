using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Brands;

public sealed record BrandSaved(Guid? ProjectId, VisitorBrand? Brand) : IStateChange
{
    public ApiaryState Apply(ApiaryState state)
    {
        if (ProjectId is not { } id)
        {
            return state with { Brand = Brand };
        }

        return state.Projects.TryGetValue(id, out var project)
            ? state with { Projects = state.Projects.SetItem(id, project with { Brand = Brand }) }
            : state;
    }
}
