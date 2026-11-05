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
    string? ChangedBy)
{
    public bool Disabled { get; init; }

    public IReadOnlyList<string>? AllowedAddresses { get; init; }

    public Stacks.StackSource? Stack { get; init; }
}
