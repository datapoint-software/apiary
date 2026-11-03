using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Agents;

public sealed record AgentPolicy(IReadOnlyList<string> TrustedOrigins)
{
    public static IReadOnlyList<string> TrustedOriginsOf(ApiaryState state) => state.AgentPolicy?.TrustedOrigins ?? [];
}
