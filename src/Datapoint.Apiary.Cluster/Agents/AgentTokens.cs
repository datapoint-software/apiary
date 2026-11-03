namespace Datapoint.Apiary.Cluster.Agents;

public sealed record AgentTokens(
    string AccessHash,
    DateTimeOffset AccessExpiresAt,
    string RefreshHash,
    DateTimeOffset RefreshExpiresAt,
    string? PreviousRefreshHash);
