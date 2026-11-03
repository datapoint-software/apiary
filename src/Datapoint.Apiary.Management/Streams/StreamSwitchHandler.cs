using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Streams;

public sealed class StreamSwitchHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<DisableStreamRoute>, ICommandHandler<EnableStreamRoute>
{
    public ValueTask HandleAsync(DisableStreamRoute command, CancellationToken ct = default) => Switch(command.Id, disabled: true);

    public ValueTask HandleAsync(EnableStreamRoute command, CancellationToken ct = default) => Switch(command.Id, disabled: false);

    private ValueTask Switch(Guid id, bool disabled)
    {
        if (!transaction.State.StreamRoutes.TryGetValue(id, out var existing))
        {
            throw ActionFailedException.NotFound(ErrorCodes.StreamNotFound);
        }

        var stream = existing with { Disabled = disabled, ChangedAt = time.GetUtcNow(), ChangedBy = principals.Principal?.Identity?.Name };
        transaction.Record(new StreamRouteSaved(stream));
        transaction.Affects(stream.Id, stream.ProjectId);
        return ValueTask.CompletedTask;
    }
}
