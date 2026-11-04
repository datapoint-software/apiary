namespace Datapoint.Apiary.Cluster.Routes;

public sealed record Route(
    Guid Id,
    Guid ProjectId,
    string Host,
    string Path,
    IReadOnlyList<RouteTarget> Targets,
    int TimeoutSeconds,
    Guid? CertificateId,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public bool Disabled { get; init; }

    public IReadOnlyList<string>? AllowedAddresses { get; init; }

    public int? RateLimit { get; init; }

    public MaintenanceWindow? Maintenance { get; init; }

    public RouteCanary? Canary { get; init; }

    public bool Sticky { get; init; }

    public bool Compression { get; init; }

    public bool Caching { get; init; }

    public bool StrictTransport { get; init; }

    public bool StrictTransportSubdomains { get; init; }

    public DateTimeOffset? CachePurgedAt { get; init; }

    public RoutePassword? Password { get; init; }
}
