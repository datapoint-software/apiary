using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.AdminAccess;

public sealed class GetAdminCertificateHandler(IClusterState cluster) : IQueryHandler<GetAdminCertificate, AdminCertificateView?>
{
    public ValueTask<AdminCertificateView?> HandleAsync(GetAdminCertificate query, CancellationToken ct = default) =>
        new(cluster.Current.AdminCertificate is { } certificate ? AdminCertificateView.From(certificate) : null);
}
