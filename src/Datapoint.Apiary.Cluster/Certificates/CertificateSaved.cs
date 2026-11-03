using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record CertificateSaved(Certificate Certificate) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state with { Certificates = state.Certificates.SetItem(Certificate.Id, Certificate) };
}
