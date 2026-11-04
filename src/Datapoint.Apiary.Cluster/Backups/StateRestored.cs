using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Backups;

public sealed record StateRestored(ApiaryState Restored) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with
    {
        Projects = Restored.Projects,
        Routes = Restored.Routes,
        Redirects = Restored.Redirects,
        StreamRoutes = Restored.StreamRoutes,
        Users = Restored.Users,
        Certificates = Restored.Certificates,
        AcmeAccounts = Restored.AcmeAccounts,
        SetupCompleted = Restored.SetupCompleted,
        Audit = MergedAudit(state.Audit, Restored.Audit),
        SingleSignOn = Restored.SingleSignOn,
        Brand = Restored.Brand,
        SessionPolicy = Restored.SessionPolicy,
        RouteDefaults = Restored.RouteDefaults,
        AgentPolicy = Restored.AgentPolicy,
        Sessions = ImmutableDictionary<Guid, Session>.Empty,
        Agents = ImmutableDictionary<Guid, Agent>.Empty,
        Locks = ImmutableDictionary<string, StateLock>.Empty,
        AcmeChallenges = ImmutableDictionary<string, AcmeChallenge>.Empty,
    };

    private static ImmutableList<AuditEntry> MergedAudit(ImmutableList<AuditEntry> current, ImmutableList<AuditEntry> restored)
    {
        var known = current.Select(e => e.Id).ToHashSet();
        return [.. current.Concat(restored.Where(e => !known.Contains(e.Id))).OrderBy(e => e.At).ThenBy(e => e.Id)];
    }
}
