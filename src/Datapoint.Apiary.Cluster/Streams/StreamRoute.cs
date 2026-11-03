namespace Datapoint.Apiary.Cluster.Streams;

public sealed record StreamRoute(
    Guid Id,
    Guid ProjectId,
    string Name,
    StreamProtocol Protocol,
    int ListenPort,
    string TargetHost,
    int TargetPort,
    IReadOnlyList<string> ServerNames,
    int IdleTimeoutSeconds,
    DateTimeOffset ChangedAt,
    string? ChangedBy);
