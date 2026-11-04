using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Audit;
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

namespace Datapoint.Apiary.Testing.Builders;

public static class StateBuilders
{
    private static readonly DateTimeOffset s_now = TestClock.Now;

    public static Guid AnId() => Guid.CreateVersion7(s_now);

    public static Project AProject(string name = "Shop") =>
        new(AnId(), name, "The online shop", "storefront");

    public static Route ARoute(Guid? projectId = null, string host = "shop.example.com", string path = "/") =>
        new(AnId(), projectId ?? AnId(), host, path, [ATarget()], 30, null, s_now, "ana@example.com");

    public static RouteTarget ATarget(string host = "shop_web", int port = 8080, int weight = 100) => new(host, port, weight);

    public static Redirect ARedirect(Guid? projectId = null, string from = "www.example.com", string to = "https://example.com") =>
        new(AnId(), projectId ?? AnId(), from, to, 301, KeepPath: true, s_now, "ana@example.com");

    public static StreamRoute AStream(Guid? projectId = null, int listenPort = 5432) =>
        new(AnId(), projectId ?? AnId(), "Database", StreamProtocol.Tcp, listenPort, "shop_db", 5432, [], 300, s_now, "ana@example.com");

    public static User AUser(string email = "ana@example.com", Role role = Role.Administrator) =>
        new(AnId(), "Ana", email, role, UserStatus.Active, "password-hash", null, null, s_now, null);

    public static Session ASession(Guid userId) =>
        new(AnId(), userId, "token-hash", s_now, s_now.AddHours(8), "192.0.2.10", "Firefox on Linux");

    public static Agent AnAgent(Guid userId) =>
        new(AnId(), userId, "Claude", "client-id", "http://localhost:33418/callback", s_now, s_now, null, null);

    public static Certificate ACertificate(string name = "shop.example.com") =>
        new(AnId(), CertificateSource.Automatic, name, null, null, [], null, 0, null, s_now, "ana@example.com");

    public static CertificateMaterial SomeMaterial(params string[] hosts) =>
        new("chain-pem", "key-pem", hosts, "CN=Test CA", s_now.AddDays(-1), s_now.AddDays(89), "A1B2C3D4", 2);

    public static CertificateEvent AnEvent(CertificateEventKind kind = CertificateEventKind.Issued) =>
        new(s_now, kind, null, null, null);

    public static AcmeAccount AnAcmeAccount(string directoryUrl = "https://acme-staging-v02.api.letsencrypt.org/directory") =>
        new(directoryUrl, "account-key-pem", "https://acme.example/account/1", s_now);

    public static AcmeChallenge AChallenge(string token = "challenge-token", string host = "shop.example.com") =>
        new(token, token + ".thumbprint", host, s_now.AddMinutes(10));

    public static StateLock ALock(string name = "certificates", string holder = "replica-a", DateTimeOffset? expiresAt = null) =>
        new(name, holder, expiresAt ?? s_now.AddMinutes(1));

    public static AuditEntry AnAuditEntry(DateTimeOffset? at = null, string action = "route.save") =>
        new(AnId(), at ?? s_now, "ana@example.com", "Firefox on Linux", "192.0.2.10", action, ["shop.example.com"], null, AuditOutcome.Succeeded);

    public static Replica AReplica(string node = "node-a", string address = "10.0.0.2", int? schema = null) =>
        new(AnId(), node, address, s_now, schema);

    public static VisitorBrand ABrand(string name = "Example") =>
        new(name, "#0055AA", "help@example.com", null, s_now, "ana@example.com");

    public static SsoSettings SomeSsoSettings() =>
        new(true, "Example ID", "https://id.example.com", "apiary", "client-secret", "groups", ["admins"], ["operators"], ["viewers"], s_now);

    public static StateEntry AnEntry(params IStateChange[] changes) => new(AnId(), s_now, changes);

    public static ApiaryState With(this ApiaryState state, params IStateChange[] changes) =>
        changes.Aggregate(state, (current, change) => change.Apply(current));
}
