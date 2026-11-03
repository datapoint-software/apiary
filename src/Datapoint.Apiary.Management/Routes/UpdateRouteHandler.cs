using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Routes;

public sealed class UpdateRouteHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<UpdateRoute>
{
    public ValueTask HandleAsync(UpdateRoute command, CancellationToken ct = default)
    {
        if (!transaction.State.Routes.TryGetValue(command.Id, out var existing))
        {
            throw ActionFailedException.NotFound(ErrorCodes.RouteNotFound);
        }

        var route = existing with
        {
            ProjectId = command.ProjectId,
            Host = RouteNormalization.Host(command.Host),
            Path = RouteNormalization.Path(command.Path),
            Targets = [.. command.Targets.Select(t => t with { Host = t.Host.Trim().ToLowerInvariant() })],
            TimeoutSeconds = command.TimeoutSeconds,
            CertificateId = command.CertificateId,
            AllowedAddresses = RouteNormalization.Addresses(command.AllowedAddresses),
            ChangedAt = time.GetUtcNow(),
            ChangedBy = principals.Principal?.Identity?.Name,
        };
        transaction.Record(new RouteSaved(route));
        transaction.Affects(route.Id, route.ProjectId);
        return ValueTask.CompletedTask;
    }
}
