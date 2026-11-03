namespace Datapoint.Apiary.Management.Activity;

public sealed class NoActivityTelemetry : IActivityTelemetry
{
    public ValueTask<ActivityView> ReadAsync(ActivityRange range, CancellationToken cancellationToken) => new(new ActivityView(1, [], null));
}
