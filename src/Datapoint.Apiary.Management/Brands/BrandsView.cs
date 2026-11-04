namespace Datapoint.Apiary.Management.Brands;

public sealed record BrandsView(BrandView? Cluster, IReadOnlyList<ProjectBrandView> Projects);
