namespace Datapoint.Apiary.Management.Routes;

public sealed class NoRouteTelemetry : IRouteTelemetry
{
    public ValueTask<IReadOnlyDictionary<Guid, RouteTelemetry>> ReadAsync(CancellationToken cancellationToken) =>
        new(new Dictionary<Guid, RouteTelemetry>());
}
