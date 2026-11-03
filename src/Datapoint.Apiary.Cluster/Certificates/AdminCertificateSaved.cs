using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record AdminCertificateSaved(AdminCertificate Certificate) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { AdminCertificate = Certificate };
}
