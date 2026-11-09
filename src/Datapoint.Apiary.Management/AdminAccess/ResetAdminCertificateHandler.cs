using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.AdminAccess;

public sealed class ResetAdminCertificateHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<ResetAdminCertificate, AdminCertificateView>
{
    public ValueTask<AdminCertificateView> HandleAsync(ResetAdminCertificate command, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var certificate = new AdminCertificate(SelfSignedCertificates.Create(now), SelfSigned: true, now, principals.Principal?.Identity?.Name);
        transaction.Record(new AdminCertificateSaved(certificate));
        return new(AdminCertificateView.From(certificate));
    }
}
