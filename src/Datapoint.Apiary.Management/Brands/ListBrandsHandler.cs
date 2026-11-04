using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Brands;

public sealed class ListBrandsHandler(IClusterState cluster) : IQueryHandler<ListBrands, BrandsView>
{
    public ValueTask<BrandsView> HandleAsync(ListBrands query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var projects = state.Projects.Values
            .Where(p => p.Brand is not null)
            .OrderBy(p => p.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(p => new ProjectBrandView(p.Id, p.Name, BrandView.From(p.Brand!)))
            .ToList();
        return new(new BrandsView(state.Brand is { } brand ? BrandView.From(brand) : null, projects));
    }
}
