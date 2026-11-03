using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Acme;

public sealed record AcmeChallengesRemoved(IReadOnlyList<string> Tokens) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { AcmeChallenges = state.AcmeChallenges.RemoveRange(Tokens) };
}
