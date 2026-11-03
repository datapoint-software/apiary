using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.list", Description = "Lists the HTTP routes, sorted by hostname and path: each route's project, hostname, path, targets and timeout.")]
[RequiresRole(Role.Viewer)]
public sealed record ListRoutes(
    [property: Description("Only the routes of this project. Leave it out for every project.")] Guid? ProjectId = null)
    : IQuery<IReadOnlyList<RouteView>>;
