namespace Datapoint.Apiary.Management.Agents;

public sealed record AgentView(Guid Id, string Name, string? User, DateTimeOffset ConnectedAt, DateTimeOffset LastUsedAt, bool Mine);
