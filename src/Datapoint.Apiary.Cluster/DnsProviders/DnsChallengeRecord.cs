namespace Datapoint.Apiary.Cluster.DnsProviders;

public sealed record DnsChallengeRecord(string Name, string Value, string Zone, Guid ProviderId, DateTimeOffset ExpiresAt)
{
    public static string KeyOf(string name, string value) => name + " " + value;
}
