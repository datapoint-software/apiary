using System.ComponentModel;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.update", Description = "Replaces an HTTP route's project, hostname, path, targets, timeout and certificate. The change applies on every replica as soon as it's saved.")]
[RequiresRole(Role.Operator)]
public sealed record UpdateRoute(
    [property: Description("The route's id.")] Guid Id,
    [property: Description("The id of the project the route belongs to.")] Guid ProjectId,
    [property: Description("The hostname requests are sent to, such as shop.example.com.")] string Host,
    [property: Description("The path prefix, starting with /. Use / for the whole site.")] string Path,
    [property: Description("Where requests go: a hostname or IP address and a port. Loopback and link-local addresses are refused.")] IReadOnlyList<RouteTarget> Targets,
    [property: Description("How long to wait for the target, in seconds, from 1 to 120.")] int TimeoutSeconds = 30,
    [property: Description("The id of an uploaded certificate that covers the hostname, or null for an automatic certificate from Let's Encrypt.")] Guid? CertificateId = null,
    [property: Description("The addresses and ranges allowed to use the route, such as 10.0.0.0/8 or 2001:db8::/32. Anyone else gets a 403. Leave it empty to allow everyone.")] IReadOnlyList<string>? AllowedAddresses = null,
    [property: Description("A maintenance window, or null for none. During the window, visitors get a 503 page with the message (at most 200 characters). It can last at most 7 days and must end in the future.")] MaintenanceWindow? Maintenance = null)
    : ICommand, IRouteFields;
