using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class AddDnsProviderHandler(StateTransaction transaction, DnsChallengeWriter dns, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<AddDnsProvider, DnsProviderSaveResult>
{
    public async ValueTask<DnsProviderSaveResult> HandleAsync(AddDnsProvider command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        var provider = DnsProviderInput.Build(command, Guid.CreateVersion7(now), null, now, principals.Principal?.Identity?.Name);
        var test = await dns.TestAsync(provider, ct);
        transaction.Record(new DnsProviderSaved(provider with { LastTest = test }));
        transaction.AffectsName(provider.Name);
        return new DnsProviderSaveResult(provider.Id, DnsProviderTestView.From(test)!);
    }
}
