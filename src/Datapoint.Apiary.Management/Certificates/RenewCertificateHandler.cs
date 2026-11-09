using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class RenewCertificateHandler(IClusterState cluster, CertificateIssuer issuer, IPrincipalAccessor principals, TimeProvider time)
    : ICommandHandler<RenewCertificate, RenewResult>
{
    private static readonly TimeSpan s_minimumInterval = TimeSpan.FromDays(1);

    public async ValueTask<RenewResult> HandleAsync(RenewCertificate command, CancellationToken cancellationToken = default)
    {
        var certificate = CertificateGuards.Find(cluster.Current, command.Id);
        if (certificate.Source != CertificateSource.Automatic)
        {
            throw ActionFailedException.Conflict(ErrorCodes.CertificateNotAutomatic);
        }

        if (IsTooSoon(certificate, time.GetUtcNow()))
        {
            throw ActionFailedException.Conflict(ErrorCodes.CertificateRenewTooSoon);
        }

        var result = await issuer.IssueAsync(certificate.Name, principals.Principal?.Identity?.Name, CertificateRenewal.RenewAction, cancellationToken)
            ?? throw ActionFailedException.Conflict(ErrorCodes.CertificateRenewing);
        return new RenewResult(result.Succeeded, result.Certificate.Material?.NotAfter, result.FailureCode, result.FailureDetail);
    }

    private static bool IsTooSoon(Certificate certificate, DateTimeOffset now) =>
        (certificate.NextAttemptAt > now && RenewalPlan.LastFailureReachedAcme(certificate))
        || certificate.History.Any(e => e.Kind is CertificateEventKind.Issued or CertificateEventKind.Renewed && now - e.At < s_minimumInterval);
}
