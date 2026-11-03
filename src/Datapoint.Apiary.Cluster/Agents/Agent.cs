namespace Datapoint.Apiary.Cluster.Agents;

public sealed record Agent(
    Guid Id,
    Guid UserId,
    string Name,
    string ClientId,
    string RedirectUri,
    DateTimeOffset ConnectedAt,
    DateTimeOffset LastUsedAt,
    AgentCode? Code,
    AgentTokens? Tokens,
    string? UsedCodeHash = null);
