using Datapoint.Apiary.Cluster.Certificates;

namespace Datapoint.Apiary.Management.AdminAccess;

public sealed record AdminCertificateView(
    bool SelfSigned,
    IReadOnlyList<string> Hosts,
    string Issuer,
    DateTimeOffset NotBefore,
    DateTimeOffset NotAfter,
    string Fingerprint,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public static AdminCertificateView From(AdminCertificate certificate) => new(
        certificate.SelfSigned,
        certificate.Material.Hosts,
        certificate.Material.Issuer,
        certificate.Material.NotBefore,
        certificate.Material.NotAfter,
        certificate.Fingerprint,
        certificate.ChangedAt,
        certificate.ChangedBy);
}
