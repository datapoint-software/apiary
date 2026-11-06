using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Certificates;

[StateSchema(5)]
public sealed record CertificateChallengeChanged(Guid CertificateId, Guid? DnsProviderId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state.Certificates.TryGetValue(CertificateId, out var certificate)
        ? state with { Certificates = state.Certificates.SetItem(CertificateId, certificate with { DnsProviderId = DnsProviderId }) }
        : state;
}
