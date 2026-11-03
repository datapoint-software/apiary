using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class GetCertificateHandler(IClusterState cluster, TimeProvider time) : IQueryHandler<GetCertificate, CertificateDetails>
{
    public ValueTask<CertificateDetails> HandleAsync(GetCertificate query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var certificate = CertificateGuards.Find(state, query.Id);
        return new(new CertificateDetails(
            CertificateSummary.From(state, certificate, time.GetUtcNow()),
            certificate.Material?.ChainLength ?? 0,
            [.. CertificateUsage.Routes(state, certificate).Select(r => new CertificateRouteView(r.Id, r.Host, r.Path))],
            certificate.History,
            certificate.AddedAt,
            certificate.AddedBy));
    }
}
