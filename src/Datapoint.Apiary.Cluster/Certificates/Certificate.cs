namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record Certificate(
    Guid Id,
    CertificateSource Source,
    string Name,
    Guid? ProjectId,
    CertificateMaterial? Material,
    IReadOnlyList<CertificateEvent> History,
    DateTimeOffset? NextAttemptAt,
    int FailedAttempts,
    DateTimeOffset? UnusedSince,
    DateTimeOffset AddedAt,
    string? AddedBy,
    Guid? DnsProviderId = null,
    IReadOnlyList<string>? AlternativeNames = null,
    bool Requested = false)
{
    public const int HistoryLimit = 50;

    public IReadOnlyList<string> Names => [Name, .. AlternativeNames ?? []];

    public Certificate WithEvent(CertificateEvent change) =>
        this with { History = [change, .. History.Take(HistoryLimit - 1)] };
}
