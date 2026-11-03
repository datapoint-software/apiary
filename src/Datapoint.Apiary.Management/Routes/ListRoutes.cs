using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.list", "Lists the HTTP routes, sorted by hostname and path: each route's project, hostname, path, targets and timeout, its health across replicas (healthy, degraded when some targets don't answer, down when none do, or unknown before the first checks) and its requests per minute across replicas.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListRoutes(
    [property: Description("Only the routes of this project. Leave it out for every project.")] Guid? ProjectId = null)
    : IQuery<IReadOnlyList<RouteView>>;
