using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed record DnsProviderDetails(
    DnsProviderView Provider,
    IReadOnlyDictionary<string, string> Settings,
    IReadOnlyList<string> SecretsSet,
    IReadOnlyList<string> Certificates)
{
    public static DnsProviderDetails From(ApiaryState state, DnsProvider provider) =>
        new(DnsProviderView.From(state, provider), provider.Settings, [.. provider.Secrets.Keys.Order(StringComparer.Ordinal)],
            [.. DnsProviderView.CertificatesUsing(state, provider.Id).Select(c => c.Name).Order(StringComparer.Ordinal)]);
}
