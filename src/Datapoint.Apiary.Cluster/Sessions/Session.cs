namespace Datapoint.Apiary.Cluster.Sessions;

public sealed record Session(
    Guid Id,
    Guid UserId,
    string TokenHash,
    DateTimeOffset StartedAt,
    DateTimeOffset ExpiresAt,
    string? Address,
    string? Device);
