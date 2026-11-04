using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Backups;

public sealed class StateRestoredTests
{
    private static readonly ClusterCa s_ca = new("ca-pem", "ca-key", TestClock.Now.AddYears(2));

    [Fact]
    public void Restoring_replaces_the_projects_and_routes()
    {
        var project = AProject();
        var route = ARoute(project.Id);
        var backup = ApiaryState.Empty.With(new ProjectSaved(project), new RouteSaved(route));
        var current = ApiaryState.Empty.With(new ProjectSaved(AProject("Blog")), new RouteSaved(ARoute()));

        var restored = current.With(new StateRestored(backup));

        Assert.Equal((project.Id, route.Id), (restored.Projects.Keys.Single(), restored.Routes.Keys.Single()));
    }

    [Fact]
    public void Restoring_replaces_the_users()
    {
        var user = AUser();
        var backup = ApiaryState.Empty.With(new UserSaved(user));
        var current = ApiaryState.Empty.With(new UserSaved(AUser("bea@example.com")));

        var restored = current.With(new StateRestored(backup));

        Assert.Equal([user.Id], restored.Users.Keys);
    }

    [Fact]
    public void Restoring_replaces_redirects_streams_certificates_and_acme_accounts()
    {
        var backup = ApiaryState.Empty.With(
            new RedirectSaved(ARedirect()),
            new StreamRouteSaved(AStream()),
            new CertificateSaved(ACertificate()),
            new AcmeAccountSaved(AnAcmeAccount()));

        var restored = ApiaryState.Empty.With(new StateRestored(backup));

        Assert.Equal((1, 1, 1, 1), (restored.Redirects.Count, restored.StreamRoutes.Count, restored.Certificates.Count, restored.AcmeAccounts.Count));
    }

    [Fact]
    public void Restoring_replaces_single_sign_on_and_setup()
    {
        var settings = SomeSsoSettings();
        var backup = ApiaryState.Empty.With(new SsoSettingsSaved(settings), new SetupCompleted());

        var restored = ApiaryState.Empty.With(new StateRestored(backup));

        Assert.Equal((settings, true), (restored.SingleSignOn, restored.SetupCompleted));
    }

    [Fact]
    public void Restoring_replaces_the_visitor_brand()
    {
        var brand = ABrand();

        var restored = ApiaryState.Empty.With(new BrandSaved(null, ABrand("Other")), new StateRestored(ApiaryState.Empty.With(new BrandSaved(null, brand))));

        Assert.Same(brand, restored.Brand);
    }

    [Fact]
    public void Restoring_replaces_the_session_policy()
    {
        var restored = ApiaryState.Empty.With(new SessionPolicySaved(new SessionPolicy(60)), new StateRestored(ApiaryState.Empty.With(new SessionPolicySaved(new SessionPolicy(30)))));

        Assert.Equal(new SessionPolicy(30), restored.SessionPolicy);
    }

    [Fact]
    public void Restoring_replaces_the_route_defaults()
    {
        var restored = ApiaryState.Empty.With(new RouteDefaultsSaved(new RouteDefaults(5000)), new StateRestored(ApiaryState.Empty.With(new RouteDefaultsSaved(new RouteDefaults(30)))));

        Assert.Equal(new RouteDefaults(30), restored.RouteDefaults);
    }

    [Fact]
    public void Restoring_replaces_the_agent_policy()
    {
        var policy = new AgentPolicy(["https://claude.ai"]);

        var restored = ApiaryState.Empty.With(new AgentPolicySaved(new AgentPolicy([])), new StateRestored(ApiaryState.Empty.With(new AgentPolicySaved(policy))));

        Assert.Same(policy, restored.AgentPolicy);
    }

    [Fact]
    public void Restoring_ends_every_session_agent_lock_and_challenge()
    {
        var userId = AnId();
        var current = ApiaryState.Empty.With(new SessionStarted(ASession(userId)), new AgentSaved(AnAgent(userId)), new LockTaken(ALock(), TestClock.Now), new AcmeChallengesAdded([AChallenge()]));

        var restored = current.With(new StateRestored(ApiaryState.Empty));

        Assert.Equal((0, 0, 0, 0), (restored.Sessions.Count, restored.Agents.Count, restored.Locks.Count, restored.AcmeChallenges.Count));
    }

    [Fact]
    public void Restoring_keeps_the_cluster_s_identity_and_replicas()
    {
        var clusterId = AnId();
        var replica = AReplica();
        var current = ApiaryState.Empty.With(new ClusterCreated(clusterId, s_ca), new ReplicaSaved(replica));

        var restored = current.With(new StateRestored(ApiaryState.Empty.With(new ClusterCreated(AnId(), s_ca with { KeyPem = "other" }))));

        Assert.Equal((clusterId, s_ca, replica.Id), (restored.ClusterId, restored.ClusterCa, restored.Replicas.Keys.Single()));
    }

    [Fact]
    public void Restoring_keeps_the_audit_log_and_adds_the_backup_s_older_entries()
    {
        var older = AnAuditEntry(TestClock.Now.AddDays(-1));
        var newer = AnAuditEntry(TestClock.Now);

        var restored = ApiaryState.Empty.With(new AuditRecorded(newer), new StateRestored(ApiaryState.Empty.With(new AuditRecorded(older))));

        Assert.Equal([older, newer], restored.Audit);
    }

    [Fact]
    public void Restoring_doesn_t_repeat_audit_entries_both_logs_have()
    {
        var entry = AnAuditEntry();
        var current = ApiaryState.Empty.With(new AuditRecorded(entry));

        var restored = current.With(new StateRestored(current));

        Assert.Equal([entry], restored.Audit);
    }
}
