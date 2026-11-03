using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Certificates;

[Action("certificates.list", Description = "Lists automatic and uploaded certificates, soonest to expire first, with their status, the routes using them and any renewal failure. Never includes private keys.")]
[RequiresRole(Role.Viewer)]
public sealed record ListCertificates : IQuery<IReadOnlyList<CertificateSummary>>;
