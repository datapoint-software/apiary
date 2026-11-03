using Datapoint.Apiary.Cluster.Streams;

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
    long Connections,
    DateTimeOffset ChangedAt,
    string? ChangedBy)
{
    public static StreamRouteView Of(StreamRoute stream, long connections) => new(
        stream.Id,
        stream.ProjectId,
        stream.Name,
        stream.Protocol,
        stream.ListenPort,
        stream.TargetHost,
        stream.TargetPort,
        stream.ServerNames,
        stream.IdleTimeoutSeconds,
        connections,
        stream.ChangedAt,
        stream.ChangedBy);
}
