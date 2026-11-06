using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.set-challenge", "Changes how Let's Encrypt checks an automatic certificate from its next renewal: through a DNS provider's TXT records (DNS-01), or a file on port 80 (HTTP-01). For a route's hostname that has no certificate yet, it sets how its first one is checked.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record SetCertificateChallenge(
    [property: Description("The automatic certificate's name: a route's hostname, or the first name of a requested certificate, such as *.example.com.")] string Name,
    [property: Description("The DNS provider, from dns-providers.list, or null for HTTP-01. Wildcards need one.")] Guid? DnsProviderId)
    : ICommand;
