using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

[Action("trusted-proxies.add", "Trusts a load balancer, CDN or other proxy in front of Apiary. Public routes then take the client's address from the X-Forwarded-For and the scheme from the X-Forwarded-Proto it sends, for allowlists, rate limits, password tries, HTTPS and the access log. Anyone who can connect from the range can claim any address, so add only your proxies' own ranges. The admin port never uses it.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record AddTrustedProxy(
    [property: Description("The address the proxy connects from, or a range, such as 10.20.30.0/24 or 2400:cb00::/32. 0.0.0.0/0 and ::/0 are refused.")] string Range,
    [property: Description("What the proxy is, such as \"Load balancer in front of the edge nodes\". At most 100 characters.")] string? Note = null)
    : ICommand<Guid>;
