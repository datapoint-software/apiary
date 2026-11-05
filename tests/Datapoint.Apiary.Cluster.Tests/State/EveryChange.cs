using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Cluster.Brands;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Keys;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.State;

public static class EveryChange
{
    private static readonly ClusterCa s_ca = new("ca-pem", "ca-key", TestClock.Now.AddYears(2));

    public static IReadOnlyList<IStateChange> Samples()
    {
        var project = AProject() with { Brand = ABrand() with { Logo = new BrandLogo("image/png", "iVBORw0K", "logo.png") } };
        var user = AUser() with
        {
            TwoStep = new TwoStepSetup("secret", TestClock.Now, 123, ["code-hash"]),
            Invite = new Invite("invite-hash", TestClock.Now.AddDays(7)),
            ExternalId = "external",
            Language = "pt",
        };
        var route = ARoute(project.Id) with
        {
            AllowedAddresses = ["192.0.2.0/24"],
            RateLimit = 100,
            RequestSize = RequestSizeLimit.Custom,
            RequestMegabytes = 500,
            Maintenance = new MaintenanceWindow(TestClock.Now, TestClock.Now.AddHours(1), "Back soon"),
            Canary = new RouteCanary(CanarySource.Header, "X-Canary", "yes"),
            Sticky = true,
            Password = new RoutePassword("hash", "cookie-key", TestClock.Now, "ana@example.com", 7, "Ask Ana", new RouteLink("link-hash", TestClock.Now.AddDays(7))),
            Stack = new StackSource("shop", "web", "site", ["host", "targets"]),
        };
        var changed = new StackPlanItem(StackItemKind.Route, "shop.example.com") { Field = "host", From = "old.example.com", To = "shop.example.com", ReplacedBy = "ana@example.com", ReplacedAt = TestClock.Now };
        var stack = AStack() with
        {
            ProjectId = project.Id,
            LastApply = new StackApply(TestClock.Now, "shop-deploy", "4f2a9c1", "https://gitlab.example.com/shop/-/pipelines/7", new StackPlan([new StackPlanItem(StackItemKind.Redirect, "old.example.com")], [changed], [new StackPlanItem(StackItemKind.StreamRoute, "postgres")])),
            Failure = new StackFailure(TestClock.Now, "route.hostInUse", "shop-deploy"),
        };
        var token = APipelineToken() with { LastUsedAt = TestClock.Now };
        var agent = AnAgent(user.Id) with
        {
            Code = new AgentCode("code-hash", "challenge", TestClock.Now.AddMinutes(1)),
            Tokens = new AgentTokens("access", TestClock.Now.AddHours(1), "refresh", TestClock.Now.AddDays(30), null),
        };
        var certificate = ACertificate() with { Material = SomeMaterial("shop.example.com"), History = [AnEvent()] };
        var restored = ApiaryState.Empty.With(new ProjectSaved(project), new RouteSaved(route), new UserSaved(user), new StackSaved(stack), new PipelineTokenSaved(token));

        return
        [
            new ProjectSaved(project),
            new ProjectDeleted(project.Id),
            new RouteSaved(route),
            new RouteDeleted(route.Id),
            new RedirectSaved(ARedirect(project.Id)),
            new PathRedirectSaved(ARedirect(project.Id) with { Path = "/docs" }),
            new RedirectDeleted(AnId()),
            new UserSaved(user),
            new UserDeleted(user.Id),
            new SetupCompleted(),
            new SessionStarted(ASession(user.Id)),
            new SessionsEnded([AnId()]),
            new AgentSaved(agent),
            new AgentsRemoved([agent.Id]),
            new CertificateSaved(certificate),
            new CertificateDeleted(certificate.Id),
            new AcmeAccountSaved(AnAcmeAccount()),
            new AcmeChallengesAdded([AChallenge()]),
            new AcmeChallengesRemoved(["challenge-token"]),
            new LockTaken(ALock(), TestClock.Now),
            new LockReleased("certificates", "replica-a"),
            new AuditRecorded(AnAuditEntry()),
            new ClusterCreated(AnId(), s_ca),
            new ReplicaSaved(AReplica(schema: 1) with { RootKeyId = "root-1" }),
            new ReplicaRemoved(AnId(), TestClock.Now),
            new ClusterRecovered(AnId(), s_ca, AReplica()),
            new MembershipChanged(new MembershipSettings(MembershipMode.Manual, 10)),
            new ReplicaApproved(AnId()),
            new ReplicaLeft(AnId()),
            new DataKeyAdded(StateEncryption.NewDataKey(TestClock.Now)),
            new RootKeyRegistered(new JoinKeys("root-1", "mac", "transport"), TestClock.Now),
            new RootKeysForgotten("root-1"),
            new ClusterCaAdded(s_ca, TestClock.Now),
            new ClusterCaPromoted(TestClock.Now),
            new ClusterCaRetired(TestClock.Now),
            new BackupExported(new LastBackup(TestClock.Now, "ana@example.com", 42)),
            new StateRestored(restored),
            new SsoSettingsSaved(SomeSsoSettings()),
            new StreamRouteSaved(AStream(project.Id) with { ServerNames = ["db.example.com"], AllowedAddresses = ["10.0.0.0/8"] }),
            new StreamRouteDeleted(AnId()),
            new AdminCertificateSaved(new AdminCertificate(SomeMaterial("apiary.example.com"), SelfSigned: false, TestClock.Now, null)),
            new SessionPolicySaved(new SessionPolicy(30)),
            new RouteDefaultsSaved(new RouteDefaults(100)),
            new AgentPolicySaved(new AgentPolicy(["https://claude.ai"])),
            new BrandSaved(project.Id, ABrand()),
            new StackSaved(stack),
            new PipelineTokenSaved(token),
            new PipelineTokenUsed(token.Id, TestClock.Now),
            new PipelineTokenRevoked(token.Id),
            new StackRemoved("shop"),
            new TrustedProxySaved(new TrustedProxy(AnId(), "10.20.30.0/24", "Load balancer")),
            new TrustedProxyRemoved(AnId()),
        ];
    }
}
