using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.list", "Lists automatic and uploaded certificates, soonest to expire first, with their status, the routes using them and any renewal failure. Never includes private keys.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListCertificates : IQuery<IReadOnlyList<CertificateSummary>>;
