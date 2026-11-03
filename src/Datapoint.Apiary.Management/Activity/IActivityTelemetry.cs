namespace Datapoint.Apiary.Management.Activity;

public interface IActivityTelemetry
{
    ValueTask<ActivityView> ReadAsync(ActivityRange range, CancellationToken cancellationToken);
}
