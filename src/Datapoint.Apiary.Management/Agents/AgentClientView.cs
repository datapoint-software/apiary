namespace Datapoint.Apiary.Management.Agents;

public sealed record AgentClientView(string Name, string RedirectUri, string ReturnsTo, bool ReturnsToThisComputer);
