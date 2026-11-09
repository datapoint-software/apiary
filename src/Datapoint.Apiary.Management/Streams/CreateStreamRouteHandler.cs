using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Streams;

public sealed class CreateStreamRouteHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<CreateStreamRoute, Guid>
{
    public ValueTask<Guid> HandleAsync(CreateStreamRoute command, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var empty = new StreamRoute(
            Guid.CreateVersion7(now), command.ProjectId, string.Empty, command.Protocol, 0, string.Empty, 0, [], 0, now, principals.Principal?.Identity?.Name);
        var stream = StreamNormalization.Apply(empty, command);
        transaction.Record(new StreamRouteSaved(stream));
        transaction.Affects(stream.Id, stream.ProjectId);
        return new(stream.Id);
    }
}
