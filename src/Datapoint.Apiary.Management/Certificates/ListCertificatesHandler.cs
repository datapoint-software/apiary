using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class ListCertificatesHandler(IClusterState cluster, TimeProvider time)
    : IQueryHandler<ListCertificates, IReadOnlyList<CertificateSummary>>
{
    public ValueTask<IReadOnlyList<CertificateSummary>> HandleAsync(ListCertificates query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var now = time.GetUtcNow();
        return new([.. state.Certificates.Values
            .Select(c => CertificateSummary.From(state, c, now))
            .OrderBy(c => c.NotAfter ?? DateTimeOffset.MinValue)
            .ThenBy(c => c.Name, StringComparer.Ordinal)]);
    }
}
