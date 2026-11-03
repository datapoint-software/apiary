using System.ComponentModel;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.create", Description = "Creates an HTTP route that forwards requests for a hostname and path to a target, and returns the new route's id. The route applies on every replica as soon as it's saved.")]
[RequiresRole(Role.Operator)]
public sealed record CreateRoute(
    [property: Description("The id of the project the route belongs to.")] Guid ProjectId,
    [property: Description("The hostname requests are sent to, such as shop.example.com.")] string Host,
    [property: Description("The path prefix, starting with /. Use / for the whole site.")] string Path,
    [property: Description("Where requests go: a hostname or IP address and a port, such as a Swarm service name. Loopback and link-local addresses are refused.")] IReadOnlyList<RouteTarget> Targets,
    [property: Description("How long to wait for the target, in seconds, from 1 to 120.")] int TimeoutSeconds = 30)
    : ICommand<Guid>, IRouteFields;
