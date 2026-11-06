using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed record DnsProviderView(
    Guid Id,
    string Name,
    DnsProviderKind Kind,
    IReadOnlyList<string> Domains,
    string? ChallengeZone,
    DnsProviderTestView? LastTest,
    int CertificateCount,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public static DnsProviderView From(ApiaryState state, DnsProvider provider) =>
        new(provider.Id, provider.Name, provider.Kind, provider.Domains, provider.ChallengeZone, DnsProviderTestView.From(provider.LastTest),
            CertificatesUsing(state, provider.Id).Count, provider.ChangedAt, provider.ChangedBy);

    public static IReadOnlyList<Certificate> CertificatesUsing(ApiaryState state, Guid providerId) =>
        [.. state.Certificates.Values.Where(c => c.DnsProviderId == providerId)];
}
