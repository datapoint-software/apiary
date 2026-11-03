using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Management.Routes;

public sealed record RouteView(
    Guid Id,
    Guid ProjectId,
    string Host,
    string Path,
    IReadOnlyList<RouteTarget> Targets,
    int TimeoutSeconds,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public static RouteView From(Route route) =>
        new(route.Id, route.ProjectId, route.Host, route.Path, route.Targets, route.TimeoutSeconds, route.ChangedAt, route.ChangedBy);
}
