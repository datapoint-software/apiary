namespace Datapoint.Apiary.Management.Routes;

public interface IRouteTelemetry
{
    ValueTask<IReadOnlyDictionary<Guid, RouteTelemetry>> ReadAsync(CancellationToken cancellationToken);
}
