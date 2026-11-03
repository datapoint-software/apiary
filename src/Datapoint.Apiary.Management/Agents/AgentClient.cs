namespace Datapoint.Apiary.Management.Agents;

public sealed record AgentClient(string Name, IReadOnlyList<string> RedirectUris);
