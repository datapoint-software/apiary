using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.request", "Requests an automatic certificate for one or more names, such as *.example.com and example.com, ahead of any route. Apiary gets it from Let's Encrypt and keeps renewing it until it's deleted. Wildcards need a DNS provider; without one, Let's Encrypt checks each name with a file on port 80. Routes then name it with certificates.use.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record RequestCertificate(
    [property: Description("The names, at most 10. The first is the certificate's name. A wildcard such as *.example.com covers one level, not example.com itself.")] IReadOnlyList<string> Names,
    [property: Description("The DNS provider whose records prove the names (DNS-01), from dns-providers.list, or null for HTTP-01.")] Guid? DnsProviderId = null,
    [property: Description("The project the certificate is grouped under, if any.")] Guid? ProjectId = null)
    : ICommand<Guid>;
