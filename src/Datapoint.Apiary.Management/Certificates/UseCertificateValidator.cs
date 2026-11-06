using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class UseCertificateValidator : AbstractValidator<UseCertificate>
{
    public UseCertificateValidator(IClusterState cluster)
    {
        RuleFor(u => u.CertificateId).Must(id => cluster.Current.Certificates.ContainsKey(id)).WithErrorCode(ErrorCodes.CertificateNotFound);
        RuleFor(u => u.Hosts).Cascade(CascadeMode.Stop)
            .Must(hosts => hosts is { Count: > 0 }).WithErrorCode(ErrorCodes.Required)
            .Must(hosts => hosts.All(h => cluster.Current.Routes.Values.Any(r => r.Host == DnsNames.Normalize(h)))).WithErrorCode(ErrorCodes.CertificateHostWithoutRoute)
            .Must((u, hosts) => hosts.All(h => Covers(cluster.Current.Certificates[u.CertificateId], DnsNames.Normalize(h)))).WithErrorCode(ErrorCodes.CertificateDoesNotCover)
            .When(u => cluster.Current.Certificates.ContainsKey(u.CertificateId));
    }

    public static bool Covers(Certificate certificate, string host) =>
        certificate.Material?.Covers(host) ?? certificate.Names.Any(n => HostPatterns.Covers(n, host));
}
