using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.use", "Switches every route on the given hostnames to a certificate that covers them, such as a requested wildcard. SNI picks one certificate per hostname, so all of a hostname's routes switch together.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record UseCertificate(
    [property: Description("The certificate's id.")] Guid CertificateId,
    [property: Description("The hostnames whose routes switch to it.")] IReadOnlyList<string> Hosts)
    : ICommand;
