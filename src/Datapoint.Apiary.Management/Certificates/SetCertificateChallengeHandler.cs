using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Certificates;

public sealed class SetCertificateChallengeHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<SetCertificateChallenge>
{
    public ValueTask HandleAsync(SetCertificateChallenge command, CancellationToken cancellationToken = default)
    {
        var name = DnsNames.Normalize(command.Name);
        if (RenewalPlan.Automatic(transaction.State, name) is { } existing)
        {
            transaction.Record(new CertificateChallengeChanged(existing.Id, command.DnsProviderId));
            transaction.Affects(existing.Id, existing.ProjectId);
            return ValueTask.CompletedTask;
        }

        var now = time.GetUtcNow();
        var certificate = new Certificate(Guid.CreateVersion7(now), CertificateSource.Automatic, name, null, null, [], null, 0, null, now, principals.Principal?.Identity?.Name)
        {
            DnsProviderId = command.DnsProviderId,
        };
        transaction.Record(new CertificateRequested(certificate));
        transaction.Affects(certificate.Id);
        return ValueTask.CompletedTask;
    }
}
