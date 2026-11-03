using Datapoint.Apiary.Cluster.Certificates;

namespace Datapoint.Apiary.Management.Certificates;

public sealed record CertificateDetails(
    CertificateSummary Certificate,
    int ChainLength,
    IReadOnlyList<CertificateRouteView> Routes,
    IReadOnlyList<CertificateEvent> History,
    DateTimeOffset AddedAt,
    string? AddedBy);
