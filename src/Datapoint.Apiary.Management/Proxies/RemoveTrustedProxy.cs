using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

[Action("trusted-proxies.remove", "Stops trusting a proxy. Requests from it then count as coming from the proxy itself: allowlists see its address, everyone behind it shares one rate limit, and Apiary replaces the X-Forwarded-For it sends.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record RemoveTrustedProxy([property: Description("The trusted proxy's id, from trusted-proxies.list.")] Guid Id) : ICommand;
