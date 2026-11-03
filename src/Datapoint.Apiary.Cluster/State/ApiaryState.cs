using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Projects;
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

    public bool SetupCompleted { get; init; }

    public ImmutableList<AuditEntry> Audit { get; init; } = [];
}
