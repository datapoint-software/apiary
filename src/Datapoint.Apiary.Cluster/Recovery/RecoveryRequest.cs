namespace Datapoint.Apiary.Cluster.Recovery;

public sealed record RecoveryRequest(DateTimeOffset RequestedAt, long Index)
{
    public string? RequestedBy { get; init; }

    public string? Address { get; init; }
}
