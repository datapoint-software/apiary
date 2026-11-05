using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class RemoveStackAndRoutesHandler(StateTransaction transaction) : ICommandHandler<RemoveStackAndRoutes>
{
    public ValueTask HandleAsync(RemoveStackAndRoutes command, CancellationToken ct = default)
    {
        var state = transaction.State;
        if (!state.Stacks.ContainsKey(command.Name))
        {
            throw ActionFailedException.NotFound(ErrorCodes.StackNotFound);
        }

        foreach (var route in state.Routes.Values.Where(r => r.Stack?.Stack == command.Name))
        {
            transaction.Record(new RouteDeleted(route.Id));
        }

        foreach (var stream in state.StreamRoutes.Values.Where(s => s.Stack?.Stack == command.Name))
        {
            transaction.Record(new StreamRouteDeleted(stream.Id));
        }

        foreach (var redirect in state.Redirects.Values.Where(r => r.Stack?.Stack == command.Name))
        {
            transaction.Record(new RedirectDeleted(redirect.Id));
        }

        transaction.Record(new StackRemoved(command.Name));
        transaction.AffectsName(command.Name);
        return ValueTask.CompletedTask;
    }
}
