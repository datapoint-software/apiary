using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

[Action("dns-providers.list", "Lists the DNS providers Apiary writes DNS-01 records through: each one's name, kind, the domains it proves, its separate challenge zone if any, its latest test and how many certificates use it. Never shows credentials.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListDnsProviders : IQuery<IReadOnlyList<DnsProviderView>>;
