using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Acme;

public sealed record AcmeChallengesAdded(IReadOnlyList<AcmeChallenge> Challenges) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state with { AcmeChallenges = state.AcmeChallenges.SetItems(Challenges.Select(c => KeyValuePair.Create(c.Token, c))) };
}
