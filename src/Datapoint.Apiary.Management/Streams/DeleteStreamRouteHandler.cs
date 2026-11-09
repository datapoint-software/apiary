using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Streams;

public sealed class DeleteStreamRouteHandler(StateTransaction transaction) : ICommandHandler<DeleteStreamRoute>
{
    public ValueTask HandleAsync(DeleteStreamRoute command, CancellationToken cancellationToken = default)
    {
        if (!transaction.State.StreamRoutes.TryGetValue(command.Id, out var stream))
        {
            throw ActionFailedException.NotFound(ErrorCodes.StreamNotFound);
        }

        if (stream.Stack is not null)
        {
            throw ActionFailedException.Conflict(ErrorCodes.StreamDeclaredInStack);
        }

        transaction.Record(new StreamRouteDeleted(stream.Id));
        transaction.Affects(stream.Id, stream.ProjectId);
        return ValueTask.CompletedTask;
    }
}
