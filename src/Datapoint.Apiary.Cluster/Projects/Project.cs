using Datapoint.Apiary.Cluster.Brands;

namespace Datapoint.Apiary.Cluster.Projects;

public sealed record Project(Guid Id, string Name, string Description, string Icon)
{
    public VisitorBrand? Brand { get; init; }
}
