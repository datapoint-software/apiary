namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record PipelineToken(
    Guid Id,
    string Name,
    string Stack,
    string Hash,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    DateTimeOffset ExpiresAt)
{
    public DateTimeOffset? LastUsedAt { get; init; }
}
