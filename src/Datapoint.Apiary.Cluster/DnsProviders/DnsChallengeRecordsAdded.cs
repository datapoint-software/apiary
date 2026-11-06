using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.DnsProviders;

[StateSchema(5)]
public sealed record DnsChallengeRecordsAdded(IReadOnlyList<DnsChallengeRecord> Records) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with
    {
        DnsChallengeRecords = state.DnsChallengeRecords.SetItems(Records.Select(r => KeyValuePair.Create(DnsChallengeRecord.KeyOf(r.Name, r.Value), r))),
    };
}
