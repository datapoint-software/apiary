namespace Datapoint.Apiary.Cluster.Agents;

public sealed record AgentCode(string Hash, string Challenge, DateTimeOffset ExpiresAt);
