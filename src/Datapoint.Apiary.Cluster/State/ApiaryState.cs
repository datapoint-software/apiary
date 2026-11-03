using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Cluster.State;

public sealed record ApiaryState
{
    public static ApiaryState Empty { get; } = new();

    public long Index { get; init; }

    public ImmutableDictionary<Guid, Project> Projects { get; init; } = ImmutableDictionary<Guid, Project>.Empty;

    public ImmutableDictionary<Guid, Route> Routes { get; init; } = ImmutableDictionary<Guid, Route>.Empty;

    public ImmutableList<AuditEntry> Audit { get; init; } = [];
}
