using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class RequestCertificateHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<RequestCertificate, Guid>
{
    public ValueTask<Guid> HandleAsync(RequestCertificate command, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var names = CertificateNames.Normalize(command.Names);
        var certificate = new Certificate(
            Guid.CreateVersion7(now), CertificateSource.Automatic, names[0], command.ProjectId, null, [], null, 0, null, now, principals.Principal?.Identity?.Name)
        {
            DnsProviderId = command.DnsProviderId,
            AlternativeNames = names.Count > 1 ? [.. names.Skip(1)] : null,
            Requested = true,
        };
        transaction.Record(new CertificateRequested(certificate));
        transaction.Affects(certificate.Id, certificate.ProjectId);
        return new(certificate.Id);
    }
}
