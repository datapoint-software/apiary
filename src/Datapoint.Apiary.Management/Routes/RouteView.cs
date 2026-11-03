using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Management.Routes;

public sealed record RouteView(
    Guid Id,
    Guid ProjectId,
    string Host,
    string Path,
    IReadOnlyList<RouteTarget> Targets,
    int TimeoutSeconds,
    Guid? CertificateId,
    DateTimeOffset ChangedAt,
    string? ChangedBy,
    bool Disabled,
    IReadOnlyList<string> AllowedAddresses,
    int? RateLimit,
    MaintenanceWindow? Maintenance,
    RouteCanary? Canary,
    bool Sticky,
    bool Compression,
    bool Caching,
    bool StrictTransport,
    bool StrictTransportSubdomains,
    DateTimeOffset? CachePurgedAt,
    long RequestsPerMinute,
    RouteHealth Health,
    int TargetsDown)
{
    public static RouteView From(Route route, RouteTelemetry telemetry) =>
        new(route.Id, route.ProjectId, route.Host, route.Path, route.Targets, route.TimeoutSeconds, route.CertificateId, route.ChangedAt, route.ChangedBy,
            route.Disabled, route.AllowedAddresses ?? [], route.RateLimit, route.Maintenance,
            route.Canary, route.Sticky, route.Compression, route.Caching, route.StrictTransport, route.StrictTransportSubdomains, route.CachePurgedAt, telemetry.RequestsPerMinute, telemetry.Health, telemetry.TargetsDown);
}
