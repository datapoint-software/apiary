using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.get", "Gets a certificate's details: the hostnames it covers, its validity, the routes using it and its renewal or upload history. Never includes the private key.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record GetCertificate([property: Description("The certificate's id.")] Guid Id) : IQuery<CertificateDetails>;
