using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

public sealed class UpdateTrustedProxyHandler(StateTransaction transaction) : ICommandHandler<UpdateTrustedProxy>
{
    public ValueTask HandleAsync(UpdateTrustedProxy command, CancellationToken ct = default)
    {
        if (!transaction.State.TrustedProxies.TryGetValue(command.Id, out var proxy))
        {
            throw ActionFailedException.NotFound(ErrorCodes.TrustedProxyNotFound);
        }

        var updated = proxy with { Range = TrustedProxyRanges.Normalize(command.Range)!, Note = TrustedProxyRanges.Note(command.Note) };
        transaction.Record(new TrustedProxySaved(updated));
        transaction.AffectsName(proxy.Range);
        if (updated.Range != proxy.Range)
        {
            transaction.AffectsName(updated.Range);
        }

        return ValueTask.CompletedTask;
    }
}
