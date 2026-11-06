using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class UseCertificateHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals) : ICommandHandler<UseCertificate>
{
    public ValueTask HandleAsync(UseCertificate command, CancellationToken ct = default)
    {
        var hosts = command.Hosts.Select(DnsNames.Normalize).ToHashSet(StringComparer.Ordinal);
        var routes = transaction.State.Routes.Values.Where(r => hosts.Contains(r.Host)).ToList();
        var now = time.GetUtcNow();
        foreach (var route in routes.Where(r => r.CertificateId != command.CertificateId))
        {
            transaction.Record(new RouteSaved(route with { CertificateId = command.CertificateId, ChangedAt = now, ChangedBy = principals.Principal?.Identity?.Name }));
            transaction.Affects(route.Id, route.ProjectId);
        }

        return ValueTask.CompletedTask;
    }
}
