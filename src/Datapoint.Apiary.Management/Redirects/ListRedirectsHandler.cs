using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class ListRedirectsHandler(IClusterState cluster) : IQueryHandler<ListRedirects, IReadOnlyList<RedirectView>>
{
    public ValueTask<IReadOnlyList<RedirectView>> HandleAsync(ListRedirects query, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<RedirectView> redirects = [.. cluster.Current.Redirects.Values
            .Where(r => query.ProjectId is null || r.ProjectId == query.ProjectId)
            .OrderBy(r => r.From, StringComparer.Ordinal)
            .ThenBy(r => r.Path, StringComparer.OrdinalIgnoreCase)
            .Select(RedirectView.Of)];
        return new(redirects);
    }
}
