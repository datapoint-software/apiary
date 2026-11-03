using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class MoveRoutesHandler(StateTransaction transaction) : ICommandHandler<MoveRoutes>
{
    public ValueTask HandleAsync(MoveRoutes command, CancellationToken ct = default)
    {
        foreach (var id in command.Ids.Distinct())
        {
            if (!transaction.State.Routes.TryGetValue(id, out var route))
            {
                throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
            }

            if (route.ProjectId != command.ProjectId)
            {
                transaction.Record(new RouteSaved(route with { ProjectId = command.ProjectId }));
            }

            transaction.Affects(route.Id, command.ProjectId);
        }

        return ValueTask.CompletedTask;
    }
}
