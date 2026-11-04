using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

public sealed class UpdateRouteDefaultsHandler(StateTransaction transaction) : ICommandHandler<UpdateRouteDefaults>
{
    public ValueTask HandleAsync(UpdateRouteDefaults command, CancellationToken ct = default)
    {
        transaction.Record(new RouteDefaultsSaved(new RouteDefaults(command.RequestMegabytes)));
        return ValueTask.CompletedTask;
    }
}
