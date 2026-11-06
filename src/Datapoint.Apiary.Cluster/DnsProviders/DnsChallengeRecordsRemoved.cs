using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.DnsProviders;

[StateSchema(5)]
public sealed record DnsChallengeRecordsRemoved(IReadOnlyList<string> Keys) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { DnsChallengeRecords = state.DnsChallengeRecords.RemoveRange(Keys) };
}
