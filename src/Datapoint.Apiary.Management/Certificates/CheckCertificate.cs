using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.check", "Checks a PEM certificate chain and private key without saving them, and returns what the certificate covers. For the admin UI only.")]
[Api]
[RequiresRole(Role.Operator)]
public sealed record CheckCertificate(
    [property: Description("The certificate and its chain, PEM, leaf first.")] string ChainPem,
    [property: Description("The private key, PEM, without a passphrase.")] string KeyPem,
    [property: Description("The uploaded certificate this replaces, if any.")] Guid? ReplacingId = null)
    : IQuery<CertificatePreview>, ICertificateUpload;
