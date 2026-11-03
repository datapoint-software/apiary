namespace Datapoint.Apiary.Management.Agents;

public sealed record AgentPolicyView(IReadOnlyList<string> TrustedOrigins);
