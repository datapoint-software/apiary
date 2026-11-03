using System.Collections.Immutable;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
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
        Users = Restored.Users,
        Certificates = Restored.Certificates,
        AcmeAccounts = Restored.AcmeAccounts,
        SetupCompleted = Restored.SetupCompleted,
        Audit = Restored.Audit,
        SingleSignOn = Restored.SingleSignOn,
        Sessions = ImmutableDictionary<Guid, Session>.Empty,
        Agents = ImmutableDictionary<Guid, Agent>.Empty,
        Locks = ImmutableDictionary<string, StateLock>.Empty,
        AcmeChallenges = ImmutableDictionary<string, AcmeChallenge>.Empty,
    };
}
