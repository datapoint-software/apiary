using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Routes;

public sealed class RouteSwitchHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<DisableRoute>, ICommandHandler<EnableRoute>
{
    public ValueTask HandleAsync(DisableRoute command, CancellationToken cancellationToken = default) => Switch(command.Id, disabled: true);

    public ValueTask HandleAsync(EnableRoute command, CancellationToken cancellationToken = default) => Switch(command.Id, disabled: false);

    private ValueTask Switch(Guid id, bool disabled)
    {
        if (!transaction.State.Routes.TryGetValue(id, out var existing))
        {
            throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
        }

        var route = existing with { Disabled = disabled, ChangedAt = time.GetUtcNow(), ChangedBy = principals.Principal?.Identity?.Name };
        transaction.Record(new RouteSaved(route));
        transaction.Affects(route.Id, route.ProjectId);
        return ValueTask.CompletedTask;
    }
}
