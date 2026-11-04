using Datapoint.Apiary.Management.Routes;

namespace Datapoint.Apiary.Management.Tests.Fakes;

public sealed class FakeRouteTelemetry : IRouteTelemetry
{
    public IDictionary<Guid, RouteTelemetry> Readings { get; } = new Dictionary<Guid, RouteTelemetry>();

    public ValueTask<IReadOnlyDictionary<Guid, RouteTelemetry>> ReadAsync(CancellationToken cancellationToken) =>
        new(new Dictionary<Guid, RouteTelemetry>(Readings));
}
