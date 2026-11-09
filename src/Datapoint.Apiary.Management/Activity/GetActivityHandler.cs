using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Activity;

public sealed class GetActivityHandler(IActivityTelemetry telemetry) : IQueryHandler<GetActivity, ActivityView>
{
    public ValueTask<ActivityView> HandleAsync(GetActivity query, CancellationToken cancellationToken = default) => telemetry.ReadAsync(query.Range, cancellationToken);
}
