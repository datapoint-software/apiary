using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Streams;

public sealed class UpdateStreamRouteHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<UpdateStreamRoute>
{
    public ValueTask HandleAsync(UpdateStreamRoute command, CancellationToken cancellationToken = default)
    {
        if (!transaction.State.StreamRoutes.TryGetValue(command.Id, out var existing))
        {
            throw ActionFailedException.NotFound(ErrorCodes.StreamNotFound);
        }

        var stream = StreamNormalization.Apply(existing, command) with
        {
            ChangedAt = time.GetUtcNow(),
            ChangedBy = principals.Principal?.Identity?.Name,
        };
        transaction.Record(new StreamRouteSaved(stream));
        transaction.Affects(stream.Id, stream.ProjectId);
        return ValueTask.CompletedTask;
    }
}
