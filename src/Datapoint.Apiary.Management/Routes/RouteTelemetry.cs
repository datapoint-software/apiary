namespace Datapoint.Apiary.Management.Routes;

public sealed record RouteTelemetry(long RequestsPerMinute, RouteHealth Health, int TargetsDown)
{
    public long Connections { get; init; }

    public DateTimeOffset? LastConnectionAt { get; init; }

    public static RouteTelemetry Unknown { get; } = new(0, RouteHealth.Unknown, 0);
}
