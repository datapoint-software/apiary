using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

[Action("dns-providers.get", "Gets a DNS provider with its settings, to change them. Credentials are never returned, only which ones are set.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record GetDnsProvider([property: Description("The provider's id.")] Guid Id) : IQuery<DnsProviderDetails>;
