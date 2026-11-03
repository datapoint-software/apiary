using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.purge-cache", "Clears the cached responses of HTTP routes on every replica. Routes with caching off are skipped.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record PurgeRouteCaches(
    [property: Description("The ids of the routes whose cache to clear, at most 500.")] IReadOnlyList<Guid> Ids)
    : ICommand;
