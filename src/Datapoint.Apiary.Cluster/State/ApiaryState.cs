using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Cluster.State;

public sealed record ApiaryState
{
    public static ApiaryState Empty { get; } = new();

    public long Index { get; init; }

    public ImmutableDictionary<Guid, Project> Projects { get; init; } = ImmutableDictionary<Guid, Project>.Empty;

    public ImmutableDictionary<Guid, Route> Routes { get; init; } = ImmutableDictionary<Guid, Route>.Empty;

    public ImmutableDictionary<Guid, User> Users { get; init; } = ImmutableDictionary<Guid, User>.Empty;

    public ImmutableDictionary<Guid, Session> Sessions { get; init; } = ImmutableDictionary<Guid, Session>.Empty;

    public ImmutableDictionary<Guid, Certificate> Certificates { get; init; } = ImmutableDictionary<Guid, Certificate>.Empty;

    public ImmutableDictionary<string, AcmeAccount> AcmeAccounts { get; init; } = ImmutableDictionary<string, AcmeAccount>.Empty;

    public ImmutableDictionary<string, AcmeChallenge> AcmeChallenges { get; init; } = ImmutableDictionary<string, AcmeChallenge>.Empty;

    public ImmutableDictionary<string, StateLock> Locks { get; init; } = ImmutableDictionary<string, StateLock>.Empty;

    public Guid? ClusterId { get; init; }

    public ClusterCa? ClusterCa { get; init; }

    public ImmutableDictionary<Guid, Replica> Replicas { get; init; } = ImmutableDictionary<Guid, Replica>.Empty;

    public ImmutableDictionary<Guid, AppliedRequest> AppliedRequests { get; init; } = ImmutableDictionary<Guid, AppliedRequest>.Empty;

    public bool SetupCompleted { get; init; }

    public LastBackup? LastBackup { get; init; }

    public ImmutableList<AuditEntry> Audit { get; init; } = [];
}
