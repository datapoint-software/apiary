using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Certificates;

public sealed record CertificateSummary(
    Guid Id,
    CertificateSource Source,
    string Name,
    IReadOnlyList<string> Hosts,
    Guid? ProjectId,
    string? Issuer,
    DateTimeOffset? NotBefore,
    DateTimeOffset? NotAfter,
    DateTimeOffset? RenewsFrom,
    CertificateStatus Status,
    string? FailureCode,
    DateTimeOffset? NextAttemptAt,
    int RouteCount,
    DateTimeOffset? UnusedSince,
    Guid? DnsProviderId,
    bool Requested)
{
    public static CertificateSummary From(ApiaryState state, Certificate certificate, DateTimeOffset now)
    {
        var material = certificate.Material;
        return new(
            certificate.Id,
            certificate.Source,
            certificate.Name,
            material?.Hosts ?? certificate.Names,
            certificate.ProjectId,
            material?.Issuer,
            material?.NotBefore,
            material?.NotAfter,
            RenewalStart(certificate),
            CertificateUsage.Status(certificate, now),
            LastFailure(certificate),
            certificate.FailedAttempts > 0 || material is null ? certificate.NextAttemptAt : null,
            CertificateUsage.Routes(state, certificate).Count,
            certificate.UnusedSince,
            certificate.DnsProviderId,
            certificate.Requested);
    }

    private static DateTimeOffset? RenewalStart(Certificate certificate) =>
        certificate is { Material: { } material, Source: CertificateSource.Automatic } ? RenewalPlan.RenewsFrom(material) : null;

    private static string? LastFailure(Certificate certificate) =>
        certificate.FailedAttempts > 0 ? certificate.History.FirstOrDefault(e => e.Kind == CertificateEventKind.Failed)?.Code : null;
}
