using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

public sealed class RemoveTrustedProxyHandler(StateTransaction transaction) : ICommandHandler<RemoveTrustedProxy>
{
    public ValueTask HandleAsync(RemoveTrustedProxy command, CancellationToken ct = default)
    {
        if (!transaction.State.TrustedProxies.TryGetValue(command.Id, out var proxy))
        {
            throw ActionFailedException.NotFound(ErrorCodes.TrustedProxyNotFound);
        }

        transaction.Record(new TrustedProxyRemoved(proxy.Id));
        transaction.AffectsName(proxy.Range);
        return ValueTask.CompletedTask;
    }
}
