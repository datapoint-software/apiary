using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Management.DnsProviders;

public sealed record DnsProviderTestView(DateTimeOffset At, bool Succeeded, string? Code, string? Detail)
{
    public static DnsProviderTestView? From(DnsProviderTest? test) =>
        test is null ? null : new(test.At, test.Succeeded, test.Code, test.Detail);
}
