using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed class RemoveDnsProviderHandler(StateTransaction transaction) : ICommandHandler<RemoveDnsProvider>
{
    public ValueTask HandleAsync(RemoveDnsProvider command, CancellationToken cancellationToken = default)
    {
        var provider = DnsProviderGuards.Find(transaction.State, command.Id);
        var certificates = DnsProviderView.CertificatesUsing(transaction.State, provider.Id).Count;
        if (certificates > 0)
        {
            throw new ActionFailedException(ErrorCodes.DnsProviderInUse, FailureKind.Conflict)
            {
                Params = new Dictionary<string, object?>(StringComparer.Ordinal) { ["certificates"] = certificates },
            };
        }

        transaction.Record(new DnsProviderRemoved(provider.Id));
        transaction.AffectsName(provider.Name);
        return ValueTask.CompletedTask;
    }
}
