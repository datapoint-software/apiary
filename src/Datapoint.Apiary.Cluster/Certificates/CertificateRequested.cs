using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Certificates;

[StateSchema(5)]
public sealed record CertificateRequested(Certificate Certificate) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state with { Certificates = state.Certificates.SetItem(Certificate.Id, Certificate) };
}
