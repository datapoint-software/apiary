namespace Datapoint.Apiary.Cluster.DnsProviders;

public sealed record DnsProvider(
    Guid Id,
    string Name,
    DnsProviderKind Kind,
    IReadOnlyList<string> Domains,
    string? ChallengeZone,
    IReadOnlyDictionary<string, string> Settings,
    IReadOnlyDictionary<string, string> Secrets,
    DnsProviderTest? LastTest,
    DateTimeOffset ChangedAt,
    string? ChangedBy);
