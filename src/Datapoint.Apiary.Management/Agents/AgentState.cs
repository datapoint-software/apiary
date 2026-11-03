using Datapoint.Apiary.Cluster.Agents;

namespace Datapoint.Apiary.Management.Agents;

public static class AgentState
{
    public static bool IsConnected(Agent agent, DateTimeOffset now) => agent.Tokens is { } tokens && tokens.RefreshExpiresAt > now;

    public static bool IsOver(Agent agent, DateTimeOffset now) =>
        !IsConnected(agent, now) && (agent.Code is not { } code || code.ExpiresAt <= now);
}
