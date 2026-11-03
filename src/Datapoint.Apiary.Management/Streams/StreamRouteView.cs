using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Management.Routes;

namespace Datapoint.Apiary.Management.Streams;

public sealed record StreamRouteView(
    Guid Id,
    Guid ProjectId,
    string Name,
    StreamProtocol Protocol,
    int ListenPort,
    string TargetHost,
    int TargetPort,
    IReadOnlyList<string> ServerNames,
    int IdleTimeoutSeconds,
    bool Disabled,
    IReadOnlyList<string> AllowedAddresses,
    long Connections,
    DateTimeOffset? LastConnectionAt,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public static StreamRouteView Of(StreamRoute stream, RouteTelemetry? telemetry) => new(
        stream.Id,
        stream.ProjectId,
        stream.Name,
        stream.Protocol,
        stream.ListenPort,
        stream.TargetHost,
        stream.TargetPort,
        stream.ServerNames,
        stream.IdleTimeoutSeconds,
        stream.Disabled,
        stream.AllowedAddresses ?? [],
        telemetry?.Connections ?? 0,
        telemetry?.LastConnectionAt,
        stream.ChangedAt,
        stream.ChangedBy);
}
