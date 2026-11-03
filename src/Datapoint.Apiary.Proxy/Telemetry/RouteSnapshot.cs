namespace Datapoint.Apiary.Proxy.Telemetry;

public sealed record RouteSnapshot(Guid RouteId, long RequestsPerMinute, IReadOnlyList<TargetSnapshot> Targets)
{
    public long Connections { get; init; }
}
