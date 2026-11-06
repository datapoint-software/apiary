using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class UpdateDnsProviderHandler(StateTransaction transaction, DnsChallengeWriter dns, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<UpdateDnsProvider, DnsProviderSaveResult>
{
    public async ValueTask<DnsProviderSaveResult> HandleAsync(UpdateDnsProvider command, CancellationToken ct = default)
    {
        var existing = DnsProviderGuards.Find(transaction.State, command.Id);
        var provider = DnsProviderInput.Build(command, existing.Id, existing, time.GetUtcNow(), principals.Principal?.Identity?.Name);
        var test = await dns.TestAsync(provider, ct);
        transaction.Record(new DnsProviderSaved(provider with { LastTest = test }));
        transaction.AffectsName(provider.Name);
        return new DnsProviderSaveResult(provider.Id, DnsProviderTestView.From(test)!);
    }
}
