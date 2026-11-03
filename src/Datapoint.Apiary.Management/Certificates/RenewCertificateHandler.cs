using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class RenewCertificateHandler(StateTransaction transaction, CertificateIssuer issuer, IPrincipalAccessor principals)
    : ICommandHandler<RenewCertificate, RenewResult>
{
    public async ValueTask<RenewResult> HandleAsync(RenewCertificate command, CancellationToken ct = default)
    {
        var certificate = CertificateGuards.Find(transaction.State, command.Id);
        if (certificate.Source != CertificateSource.Automatic)
        {
            throw ActionFailedException.Conflict(ErrorCodes.CertificateNotAutomatic);
        }

        var result = await issuer.IssueAsync(certificate.Name, principals.Principal?.Identity?.Name, CertificateRenewal.RenewAction, ct)
            ?? throw ActionFailedException.Conflict(ErrorCodes.CertificateRenewing);
        return new RenewResult(result.Succeeded, result.Certificate.Material?.NotAfter, result.FailureCode, result.FailureDetail);
    }
}
