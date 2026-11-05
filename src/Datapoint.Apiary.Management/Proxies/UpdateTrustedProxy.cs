using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

[Action("trusted-proxies.update", "Changes a trusted proxy's address or range, or its note. Requests from a range it no longer covers are treated as coming from the proxy itself.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record UpdateTrustedProxy(
    [property: Description("The trusted proxy's id, from trusted-proxies.list.")] Guid Id,
    [property: Description("The address the proxy connects from, or a range, such as 10.20.30.0/24 or 2400:cb00::/32. 0.0.0.0/0 and ::/0 are refused.")] string Range,
    [property: Description("What the proxy is. At most 100 characters; leave it out to remove the note.")] string? Note = null)
    : ICommand;
