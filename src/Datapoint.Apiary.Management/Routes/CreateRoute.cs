using System.ComponentModel;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.create", "Creates an HTTP route that forwards requests for a hostname and path to a target, and returns the new route's id. The route applies on every replica as soon as it's saved.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record CreateRoute(
    [property: Description("The id of the project the route belongs to.")] Guid ProjectId,
    [property: Description("The hostname requests are sent to, such as shop.example.com.")] string Host,
    [property: Description("The path prefix, starting with /. Use / for the whole site.")] string Path,
    [property: Description("Where requests go: up to 10 targets, each a hostname or IP address, a port and a weight, such as a Swarm service name. With two or more, the weights split the traffic and add up to 100. Loopback and link-local addresses, cloud metadata endpoints and Apiary's admin, Raft and cluster ports are refused.")] IReadOnlyList<RouteTarget> Targets,
    [property: Description("How long to wait for the target, in seconds, from 1 to 120.")] int TimeoutSeconds = 30,
    [property: Description("The id of an uploaded certificate that covers the hostname, or null for an automatic certificate from Let's Encrypt.")] Guid? CertificateId = null,
    [property: Description("The addresses and ranges allowed to use the route, such as 10.0.0.0/8 or 2001:db8::/32. Anyone else gets a 403. Leave it empty to allow everyone.")] IReadOnlyList<string>? AllowedAddresses = null,
    [property: Description("The most requests a minute from each client address (each /64 network for IPv6), counted on each replica, from 1 to 100000. Beyond it, clients get a 429 page with Retry-After. Leave it null for no limit.")] int? RateLimit = null,
    [property: Description("A maintenance window, or null for none. During the window, visitors get a 503 page with the message (at most 200 characters). It can last at most 7 days and must end in the future.")] MaintenanceWindow? Maintenance = null,
    [property: Description("Sends requests that carry this header or cookie (source header or cookie, name and value) to the last target, so testers reach a new version on purpose. Needs two or more targets.")] RouteCanary? Canary = null,
    [property: Description("Keeps each visitor on the target they first reached, for 1 hour, with a cookie.")] bool Sticky = false,
    [property: Description("Compresses responses with Brotli or gzip. Leave it off for pages that mix secrets with text visitors can influence (the BREACH attack).")] bool Compression = false,
    [property: Description("Caches responses in memory on each replica, only as the target allows with Cache-Control.")] bool Caching = false,
    [property: Description("Sends Strict-Transport-Security for a year, so browsers that visited the hostname over HTTPS refuse plain HTTP to it, on any port. Hard to undo: browsers keep it until it expires.")] bool StrictTransport = false,
    [property: Description("With strictTransport, also covers every subdomain of the hostname. Only turn it on when they all serve HTTPS.")] bool StrictTransportSubdomains = false,
    [property: Description("Asks visitors for a shared password before they reach the site, on a page Apiary shows, or null to let everyone in. For demos and previews that aren't ready to be public. Apiary keeps only hashes, and never returns the password or the link key.")] RoutePasswordSettings? Password = null)
    : ICommand<Guid>, IRouteFields;
