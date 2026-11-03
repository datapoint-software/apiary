using System.ComponentModel;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.update", Description = "Replaces an HTTP route's project, hostname, path, targets and timeout. The change applies on every replica as soon as it's saved.")]
[RequiresRole(Role.Operator)]
public sealed record UpdateRoute(
    [property: Description("The route's id.")] Guid Id,
    [property: Description("The id of the project the route belongs to.")] Guid ProjectId,
    [property: Description("The hostname requests are sent to, such as shop.example.com.")] string Host,
    [property: Description("The path prefix, starting with /. Use / for the whole site.")] string Path,
    [property: Description("Where requests go: a hostname or IP address and a port. Loopback and link-local addresses are refused.")] IReadOnlyList<RouteTarget> Targets,
    [property: Description("How long to wait for the target, in seconds, from 1 to 120.")] int TimeoutSeconds = 30)
    : ICommand, IRouteFields;
