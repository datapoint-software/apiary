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
}
