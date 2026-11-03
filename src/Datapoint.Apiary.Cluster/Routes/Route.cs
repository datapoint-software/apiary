namespace Datapoint.Apiary.Cluster.Routes;

public sealed record Route(
    Guid Id,
    Guid ProjectId,
    string Host,
    string Path,
    IReadOnlyList<RouteTarget> Targets,
    int TimeoutSeconds,
    DateTimeOffset ChangedAt,
    string? ChangedBy);
