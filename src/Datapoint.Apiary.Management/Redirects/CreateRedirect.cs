using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

[Action("redirects.create", "Redirects every request for a hostname to another address, such as www.example.com to https://example.com, and returns the new redirect's id. The hostname gets an automatic certificate, so HTTPS visitors are redirected too.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record CreateRedirect(
    [property: Description("The id of the project the redirect belongs to.")] Guid ProjectId,
    [property: Description("The hostname to redirect, such as www.example.com. It can't also be a route's hostname, nor a wildcard.")] string From,
    [property: Description("The address to send visitors to: a full http:// or https:// URL, such as https://example.com.")] string To,
    [property: Description("The status code: 308 (permanent, keeps the method), 307 (temporary, keeps the method), 301 (permanent) or 302 (temporary).")] int StatusCode = 308,
    [property: Description("Whether to append the request's path and query to the address, so www.example.com/shoes goes to example.com/shoes.")] bool KeepPath = true)
    : ICommand<Guid>;
