using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Certificates;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.AdminAccess;

[Action("admin-certificate.upload", "Replaces the admin interface's certificate on every replica. For the admin UI only, so private keys never pass through an agent.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record UploadAdminCertificate(
    [property: Description("The certificate and its chain, PEM, leaf first.")] string ChainPem,
    [property: Description("The private key, PEM, without a passphrase.")] string KeyPem)
    : ICommand<AdminCertificateView>, ICertificateUpload
{
    public Guid? ReplacingId => null;
}
