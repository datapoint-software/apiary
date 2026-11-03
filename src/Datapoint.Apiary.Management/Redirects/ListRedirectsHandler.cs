using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class ListRedirectsHandler(IClusterState cluster) : IQueryHandler<ListRedirects, IReadOnlyList<RedirectView>>
{
    public ValueTask<IReadOnlyList<RedirectView>> HandleAsync(ListRedirects query, CancellationToken ct = default)
    {
        IReadOnlyList<RedirectView> redirects = [.. cluster.Current.Redirects.Values
            .Where(r => query.ProjectId is null || r.ProjectId == query.ProjectId)
            .OrderBy(r => r.From, StringComparer.Ordinal)
            .Select(RedirectView.Of)];
        return new(redirects);
    }
}
