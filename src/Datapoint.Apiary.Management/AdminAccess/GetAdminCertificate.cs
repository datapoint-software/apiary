using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.AdminAccess;

[Action("admin-certificate.get", Description = "Gets the certificate the admin interface uses: self-signed or uploaded, what it covers, its validity and its SHA-256 fingerprint. Never includes the private key. Null until the cluster creates its first one.")]
[RequiresRole(Role.Administrator)]
public sealed record GetAdminCertificate : IQuery<AdminCertificateView?>;
