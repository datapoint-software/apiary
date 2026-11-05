using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Cluster.State;

public sealed record ApiaryState
{
    private readonly ImmutableList<Guid>? _previousClusterIds;
    private readonly ImmutableHashSet<Guid>? _approvedReplicas;
    private readonly ImmutableDictionary<Guid, DateTimeOffset>? _removedReplicas;
    private readonly ImmutableDictionary<Guid, Redirect>? _redirects;
    private readonly ImmutableList<Keys.RegisteredRootKey>? _rootKeys;
    private readonly ImmutableDictionary<Guid, Agent>? _agents;
    private readonly ImmutableDictionary<Guid, Streams.StreamRoute>? _streamRoutes;
    private readonly ImmutableDictionary<string, Stacks.StackRecord>? _stacks;
    private readonly ImmutableDictionary<Guid, Stacks.PipelineToken>? _pipelineTokens;
    private readonly ImmutableDictionary<Guid, Proxies.TrustedProxy>? _trustedProxies;

    public static ApiaryState Empty { get; } = new();

    public long Index { get; init; }

    public ImmutableDictionary<Guid, Project> Projects { get; init; } = ImmutableDictionary<Guid, Project>.Empty;

    public ImmutableDictionary<Guid, Route> Routes { get; init; } = ImmutableDictionary<Guid, Route>.Empty;

    public ImmutableDictionary<Guid, Redirect> Redirects
    {
        get => _redirects ?? ImmutableDictionary<Guid, Redirect>.Empty;
        init => _redirects = value;
    }

    public ImmutableDictionary<Guid, Streams.StreamRoute> StreamRoutes
    {
        get => _streamRoutes ?? ImmutableDictionary<Guid, Streams.StreamRoute>.Empty;
        init => _streamRoutes = value;
    }

    public ImmutableDictionary<string, Stacks.StackRecord> Stacks
    {
        get => _stacks ?? ImmutableDictionary<string, Stacks.StackRecord>.Empty;
        init => _stacks = value;
    }

    public ImmutableDictionary<Guid, Stacks.PipelineToken> PipelineTokens
    {
        get => _pipelineTokens ?? ImmutableDictionary<Guid, Stacks.PipelineToken>.Empty;
        init => _pipelineTokens = value;
    }

    public ImmutableDictionary<Guid, Proxies.TrustedProxy> TrustedProxies
    {
        get => _trustedProxies ?? ImmutableDictionary<Guid, Proxies.TrustedProxy>.Empty;
        init => _trustedProxies = value;
    }

    public ImmutableDictionary<Guid, User> Users { get; init; } = ImmutableDictionary<Guid, User>.Empty;

    public ImmutableDictionary<Guid, Session> Sessions { get; init; } = ImmutableDictionary<Guid, Session>.Empty;

    public ImmutableDictionary<Guid, Agent> Agents
    {
        get => _agents ?? ImmutableDictionary<Guid, Agent>.Empty;
        init => _agents = value;
    }

    public ImmutableDictionary<Guid, Certificate> Certificates { get; init; } = ImmutableDictionary<Guid, Certificate>.Empty;

    public ImmutableDictionary<string, AcmeAccount> AcmeAccounts { get; init; } = ImmutableDictionary<string, AcmeAccount>.Empty;

    public ImmutableDictionary<string, AcmeChallenge> AcmeChallenges { get; init; } = ImmutableDictionary<string, AcmeChallenge>.Empty;

    public ImmutableDictionary<string, StateLock> Locks { get; init; } = ImmutableDictionary<string, StateLock>.Empty;

    public Guid? ClusterId { get; init; }

    public ClusterCa? ClusterCa { get; init; }

    public ClusterCa? NextClusterCa { get; init; }

    public ClusterCa? RetiringClusterCa { get; init; }

    public DateTimeOffset? ClusterCaChangedAt { get; init; }

    public ImmutableList<Guid> PreviousClusterIds
    {
        get => _previousClusterIds ?? [];
        init => _previousClusterIds = value;
    }

    public ImmutableDictionary<Guid, Replica> Replicas { get; init; } = ImmutableDictionary<Guid, Replica>.Empty;

    public MembershipSettings? Membership { get; init; }

    public ImmutableHashSet<Guid> ApprovedReplicas
    {
        get => _approvedReplicas ?? [];
        init => _approvedReplicas = value;
    }

    public ImmutableDictionary<Guid, DateTimeOffset> RemovedReplicas
    {
        get => _removedReplicas ?? ImmutableDictionary<Guid, DateTimeOffset>.Empty;
        init => _removedReplicas = value;
    }

    public ImmutableList<Keys.RegisteredRootKey> RootKeys
    {
        get => _rootKeys ?? [];
        init => _rootKeys = value;
    }

    public ImmutableDictionary<Guid, AppliedRequest> AppliedRequests { get; init; } = ImmutableDictionary<Guid, AppliedRequest>.Empty;

    public bool SetupCompleted { get; init; }

    public LastBackup? LastBackup { get; init; }

    public SingleSignOn.SsoSettings? SingleSignOn { get; init; }

    public AdminCertificate? AdminCertificate { get; init; }

    public SessionPolicy? SessionPolicy { get; init; }

    public RouteDefaults? RouteDefaults { get; init; }

    public AgentPolicy? AgentPolicy { get; init; }

    public Brands.VisitorBrand? Brand { get; init; }

    public ImmutableList<AuditEntry> Audit { get; init; } = [];
}
