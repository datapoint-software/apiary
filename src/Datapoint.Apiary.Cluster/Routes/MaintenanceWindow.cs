namespace Datapoint.Apiary.Cluster.Routes;

public sealed record MaintenanceWindow(DateTimeOffset Start, DateTimeOffset End, string? Message = null)
{
    public bool IsActive(DateTimeOffset now) => Start <= now && now < End;
}
