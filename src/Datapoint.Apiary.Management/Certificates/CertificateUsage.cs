using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Certificates;

public static class CertificateUsage
{
    public static readonly TimeSpan UploadedWarning = TimeSpan.FromDays(30);
    public static readonly TimeSpan AutomaticWarning = TimeSpan.FromDays(14);

    public static IReadOnlyList<Route> Routes(ApiaryState state, Certificate certificate) =>
        [.. state.Routes.Values
            .Where(r => certificate.Source == CertificateSource.Uploaded
                ? r.CertificateId == certificate.Id
                : r.CertificateId == certificate.Id || (r.CertificateId is null && r.Host == certificate.Name))
            .OrderBy(r => r.Host, StringComparer.Ordinal)
            .ThenBy(r => r.Path, StringComparer.Ordinal)];

    public static CertificateStatus Status(Certificate certificate, DateTimeOffset now) => certificate switch
    {
        { Material: null, FailedAttempts: 0 } => CertificateStatus.Pending,
        { Material: { } m } when m.NotAfter <= now => CertificateStatus.Expired,
        { FailedAttempts: > 0 } => CertificateStatus.Failing,
        { Material: { } m } when m.NotAfter - now < Warning(certificate) => CertificateStatus.Expiring,
        _ => CertificateStatus.Ok,
    };

    private static TimeSpan Warning(Certificate certificate) =>
        certificate.Source == CertificateSource.Uploaded ? UploadedWarning : AutomaticWarning;
}
