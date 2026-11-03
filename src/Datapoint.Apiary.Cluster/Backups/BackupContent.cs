using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Backups;

public sealed record BackupContent(int Version, DateTimeOffset TakenAt, Guid? ClusterId, long Index, ApiaryState State)
{
    public const int CurrentVersion = 1;

    public static BackupContent From(ApiaryState state, DateTimeOffset now) =>
        new(CurrentVersion, now, state.ClusterId, state.Index, state with
        {
            Sessions = ImmutableDictionary<Guid, Session>.Empty,
            Agents = ImmutableDictionary<Guid, Agent>.Empty,
            AppliedRequests = ImmutableDictionary<Guid, AppliedRequest>.Empty,
            Locks = ImmutableDictionary<string, StateLock>.Empty,
            AcmeChallenges = ImmutableDictionary<string, AcmeChallenge>.Empty,
            Replicas = ImmutableDictionary<Guid, Replica>.Empty,
            ClusterCa = null,
            LastBackup = null,
        });
}
