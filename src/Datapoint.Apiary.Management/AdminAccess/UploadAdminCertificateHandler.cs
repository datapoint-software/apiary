using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.AdminAccess;

public sealed class UploadAdminCertificateHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<UploadAdminCertificate, AdminCertificateView>
{
    public ValueTask<AdminCertificateView> HandleAsync(UploadAdminCertificate command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        var material = CertificateBundle.Check(command.ChainPem, command.KeyPem, now).Material!;
        var certificate = new AdminCertificate(material, SelfSigned: false, now, principals.Principal?.Identity?.Name);
        transaction.Record(new AdminCertificateSaved(certificate));
        return new(AdminCertificateView.From(certificate));
    }
}
