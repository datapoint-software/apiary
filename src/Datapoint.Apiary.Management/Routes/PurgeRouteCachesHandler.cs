using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class PurgeRouteCachesHandler(StateTransaction transaction, TimeProvider time) : ICommandHandler<PurgeRouteCaches>
{
    public ValueTask HandleAsync(PurgeRouteCaches command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        foreach (var id in command.Ids.Distinct())
        {
            if (!transaction.State.Routes.TryGetValue(id, out var route))
            {
                throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
            }

            if (!route.Caching)
            {
                continue;
            }

            transaction.Record(new RouteSaved(route with { CachePurgedAt = now }));
            transaction.Affects(route.Id, route.ProjectId);
        }

        return ValueTask.CompletedTask;
    }
}
