namespace Datapoint.Apiary.Management.Agents;

public sealed record AgentRevocation(string? Error)
{
    public static AgentRevocation Done { get; } = new(Error: null);
}
