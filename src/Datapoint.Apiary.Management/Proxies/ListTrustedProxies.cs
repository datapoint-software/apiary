using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Proxies;

[Action("trusted-proxies.list", "Lists the load balancers, CDNs and other proxies in front of Apiary whose X-Forwarded-For and X-Forwarded-Proto public routes believe: each one's address or range, note, whether it's a public range, and its latest request on any replica.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListTrustedProxies : IQuery<IReadOnlyList<TrustedProxyView>>;
