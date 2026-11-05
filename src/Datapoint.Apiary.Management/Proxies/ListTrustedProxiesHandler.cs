using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

public sealed class ListTrustedProxiesHandler(IClusterState cluster, IRouteTelemetry telemetry) : IQueryHandler<ListTrustedProxies, IReadOnlyList<TrustedProxyView>>
{
    public async ValueTask<IReadOnlyList<TrustedProxyView>> HandleAsync(ListTrustedProxies query, CancellationToken ct = default)
    {
        // Replicas report each trusted proxy's latest request with their route telemetry, under the proxy's id.
        var reports = await telemetry.ReadAsync(ct);
        return [.. cluster.Current.TrustedProxies.Values.OrderBy(p => p.Id).Select(p => TrustedProxyView.Of(p, reports.TryGetValue(p.Id, out var r) ? r.LastConnectionAt : null))];
    }
}
