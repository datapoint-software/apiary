using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class UploadCertificateHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<UploadCertificate, Guid>
{
    public ValueTask<Guid> HandleAsync(UploadCertificate command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        var user = principals.Principal?.Identity?.Name;
        var material = CertificateBundle.Check(command.ChainPem, command.KeyPem, now).Material!;
        var existing = command.ReplacingId is { } id ? transaction.State.Certificates[id] : null;
        var kind = existing is null ? CertificateEventKind.Uploaded : CertificateEventKind.Replaced;
        var certificate = (existing ?? new Certificate(Guid.CreateVersion7(now), CertificateSource.Uploaded, material.Hosts[0], command.ProjectId, null, [], null, 0, null, now, user))
            .WithEvent(new CertificateEvent(now, kind, null, $"{material.Issuer}, valid until {material.NotAfter:yyyy-MM-dd}", user)) with
            {
                Name = material.Hosts[0],
                ProjectId = command.ProjectId,
                Material = material,
            };
        transaction.Record(new CertificateSaved(certificate));
        transaction.Affects(certificate.Id, certificate.ProjectId);
        return new(certificate.Id);
    }
}
