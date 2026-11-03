using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Routes;

public sealed class CreateRouteHandler(StateTransaction transaction, TimeProvider time, IPrincipalAccessor principals)
    : ICommandHandler<CreateRoute, Guid>
{
    public ValueTask<Guid> HandleAsync(CreateRoute command, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        var route = new Route(
            Guid.CreateVersion7(now),
            command.ProjectId,
            RouteNormalization.Host(command.Host),
            RouteNormalization.Path(command.Path),
            RouteNormalization.Targets(command.Targets),
            command.TimeoutSeconds,
            command.CertificateId,
            now,
            principals.Principal?.Identity?.Name)
        {
            AllowedAddresses = RouteNormalization.Addresses(command.AllowedAddresses),
            Maintenance = RouteNormalization.Maintenance(command.Maintenance),
            Canary = RouteNormalization.Canary(command.Canary, command.Targets.Count),
            Sticky = command.Sticky,
            Compression = command.Compression,
            Caching = command.Caching,
        };
        transaction.Record(new RouteSaved(route));
        transaction.Affects(route.Id, route.ProjectId);
        return new(route.Id);
    }
}
