using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.DnsProviders;

[Action("dns-providers.remove", "Removes a DNS provider and its credentials from every replica. Refused while a certificate uses it. Older backups still contain the credentials, so revoke them at the provider too.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record RemoveDnsProvider([property: Description("The provider's id.")] Guid Id) : ICommand;
