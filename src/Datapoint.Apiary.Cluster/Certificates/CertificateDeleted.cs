using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record CertificateDeleted(Guid Id) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Certificates = state.Certificates.Remove(Id) };
}
