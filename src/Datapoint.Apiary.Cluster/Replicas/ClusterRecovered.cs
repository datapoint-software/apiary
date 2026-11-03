using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record ClusterRecovered(Guid ClusterId, ClusterCa Ca, Replica Survivor) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with
    {
        PreviousClusterIds = state.ClusterId is { } previous ? state.PreviousClusterIds.Add(previous) : state.PreviousClusterIds,
        ClusterId = ClusterId,
        ClusterCa = Ca,
        NextClusterCa = null,
        RetiringClusterCa = null,
        ClusterCaChangedAt = null,
        Replicas = ImmutableDictionary<Guid, Replica>.Empty.Add(Survivor.Id, Survivor),
        Sessions = ImmutableDictionary<Guid, Session>.Empty,
        Agents = ImmutableDictionary<Guid, Agent>.Empty,
        Locks = ImmutableDictionary<string, StateLock>.Empty,
        AcmeChallenges = ImmutableDictionary<string, AcmeChallenge>.Empty,
        AppliedRequests = ImmutableDictionary<Guid, AppliedRequest>.Empty,
    };
}
