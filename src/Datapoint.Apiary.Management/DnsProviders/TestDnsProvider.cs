using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

[Action("dns-providers.test", "Tests a DNS provider by writing and removing a TXT record under _apiary-test, without asking Let's Encrypt for anything.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record TestDnsProvider([property: Description("The provider's id.")] Guid Id) : ICommand<DnsProviderTestView>;
