using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class DeleteRouteHandler(StateTransaction transaction) : ICommandHandler<DeleteRoute>
{
    public ValueTask HandleAsync(DeleteRoute command, CancellationToken ct = default)
    {
        if (!transaction.State.Routes.TryGetValue(command.Id, out var route))
        {
            throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
        }

        if (route.Stack is not null)
        {
            throw ActionFailedException.Conflict(ErrorCodes.RouteDeclaredInStack);
        }

        transaction.Record(new RouteDeleted(route.Id));
        transaction.Affects(route.Id, route.ProjectId);
        return ValueTask.CompletedTask;
    }
}
