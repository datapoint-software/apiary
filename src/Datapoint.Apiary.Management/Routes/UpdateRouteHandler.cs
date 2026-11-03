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
            Targets = RouteNormalization.Targets(command.Targets),
            TimeoutSeconds = command.TimeoutSeconds,
            CertificateId = command.CertificateId,
            AllowedAddresses = RouteNormalization.Addresses(command.AllowedAddresses),
            RateLimit = command.RateLimit,
            Maintenance = RouteNormalization.Maintenance(command.Maintenance),
            Canary = RouteNormalization.Canary(command.Canary, command.Targets.Count),
            Sticky = command.Sticky,
            Compression = command.Compression,
            Caching = command.Caching,
            StrictTransport = command.StrictTransport,
            StrictTransportSubdomains = command.StrictTransport && command.StrictTransportSubdomains,
            ChangedAt = time.GetUtcNow(),
            ChangedBy = principals.Principal?.Identity?.Name,
        };
        transaction.Record(new RouteSaved(route));
        transaction.Affects(route.Id, route.ProjectId);
        return ValueTask.CompletedTask;
    }
}
