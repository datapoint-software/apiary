namespace Datapoint.Apiary.Cluster.DnsProviders;

public sealed record DnsProviderTest(DateTimeOffset At, string? Code, string? Detail)
{
    public bool Succeeded => Code is null;
}
