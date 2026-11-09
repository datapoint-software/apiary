using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

public sealed class AddTrustedProxyHandler(StateTransaction transaction, TimeProvider time) : ICommandHandler<AddTrustedProxy, Guid>
{
    public ValueTask<Guid> HandleAsync(AddTrustedProxy command, CancellationToken cancellationToken = default)
    {
        var proxy = new TrustedProxy(Guid.CreateVersion7(time.GetUtcNow()), TrustedProxyRanges.Normalize(command.Range)!, TrustedProxyRanges.Note(command.Note));
        transaction.Record(new TrustedProxySaved(proxy));
        transaction.AffectsName(proxy.Range);
        return new(proxy.Id);
    }
}
