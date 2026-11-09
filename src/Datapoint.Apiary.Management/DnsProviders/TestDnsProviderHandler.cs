using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class TestDnsProviderHandler(StateTransaction transaction, DnsChallengeWriter dns) : ICommandHandler<TestDnsProvider, DnsProviderTestView>
{
    public async ValueTask<DnsProviderTestView> HandleAsync(TestDnsProvider command, CancellationToken cancellationToken = default)
    {
        var provider = DnsProviderGuards.Find(transaction.State, command.Id);
        var test = await dns.TestAsync(provider, cancellationToken);
        transaction.Record(new DnsProviderSaved(provider with { LastTest = test }));
        transaction.AffectsName(provider.Name);
        return DnsProviderTestView.From(test)!;
    }
}
