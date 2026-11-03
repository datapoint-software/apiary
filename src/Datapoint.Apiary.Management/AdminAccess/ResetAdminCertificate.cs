using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.AdminAccess;

[Action("admin-certificate.reset", Description = "Goes back to a new self-signed certificate for the admin interface, on every replica. Browsers warn about it until people accept its new fingerprint.")]
[RequiresRole(Role.Administrator)]
public sealed record ResetAdminCertificate : ICommand<AdminCertificateView>;
