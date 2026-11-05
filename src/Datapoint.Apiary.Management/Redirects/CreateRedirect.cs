using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

[Action("redirects.create", "Redirects a hostname, or a path on it, to another address, such as www.example.com to https://example.com, or example.com/old to /new, and returns the new redirect's id. A redirect at a path answers that path and everything under it before the hostname's routes. The hostname gets an automatic certificate, so HTTPS visitors are redirected too.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record CreateRedirect(
    [property: Description("The id of the project the redirect belongs to.")] Guid ProjectId,
    [property: Description("The hostname to redirect, such as www.example.com. Not a wildcard. To redirect the whole hostname, it can't also be a route's hostname.")] string From,
    [property: Description("The address to send visitors to: a full http:// or https:// URL, such as https://example.com, or, with a path, a path on the same hostname, such as /new.")] string To,
    [property: Description("The status code: 308 (permanent, keeps the method), 307 (temporary, keeps the method), 301 (permanent) or 302 (temporary).")] int StatusCode = 308,
    [property: Description("Whether to append what follows the redirected path, and the query, to the address, so www.example.com/shoes goes to example.com/shoes.")] bool KeepPath = true,
    [property: Description("The path to redirect, such as /old: it and everything under it, such as /old/page but not /older. Leave it out to redirect the whole hostname. It can't hide a route of the hostname.")] string? Path = null)
    : ICommand<Guid>;
