using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Locks;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.Renewal;

public sealed class CertificateIssuerTests : IDisposable
{
    private const string Host = "shop.example.com";
    private readonly FakeTimeProvider _time = TestClock.Fake();
    private readonly FakeClusterState _cluster = new();
    private readonly FakeAcme _acme;
    private readonly CertificateIssuer _issuer;

    public CertificateIssuerTests()
    {
        _acme = new FakeAcme(_time);
        _issuer = new CertificateIssuer(_cluster, _acme, Options.Create(new AcmeOptions()), _time, NullLogger<CertificateIssuer>.Instance);
    }

    public void Dispose()
    {
        _acme.Dispose();
        _cluster.Dispose();
    }

    [Fact]
    public async Task A_new_host_gets_its_first_certificate()
    {
        var result = await IssueAsync();

        var certificate = _cluster.Current.Certificates.Values.Single();
        Assert.True(result!.Succeeded);
        Assert.Equal((Host, CertificateSource.Automatic, CertificateEventKind.Issued), (certificate.Name, certificate.Source, certificate.History[0].Kind));
        Assert.Equal((Host, "Fake LE"), (certificate.Material!.Hosts.Single(), certificate.Material.Issuer));
    }

    [Fact]
    public async Task An_issued_certificate_is_audited_as_the_system()
    {
        await IssueAsync();

        var entry = _cluster.Current.Audit.Single();
        Assert.Equal(((string?)null, CertificateIssuer.SystemActor, CertificateRenewal.IssueAction, AuditOutcome.Succeeded), (entry.User, entry.Client, entry.Action, entry.Outcome));
    }

    [Fact]
    public async Task A_renewal_someone_asked_for_is_audited_as_them()
    {
        var user = AUser("olga@example.com");
        _cluster.Current = _cluster.Current.With(new UserSaved(user));

        await _issuer.IssueAsync(Host, "olga@example.com", CertificateRenewal.RenewAction, TestContext.Current.CancellationToken);

        var entry = _cluster.Current.Audit.Single();
        Assert.Equal(("olga@example.com", (string?)null, user.Id), (entry.User, entry.Client, entry.UserId));
    }

    [Fact]
    public async Task Renewing_keeps_the_certificate_and_records_a_renewal()
    {
        await IssueAsync();
        var first = _cluster.Current.Certificates.Values.Single();
        _time.Advance(TimeSpan.FromDays(60));

        await IssueAsync();

        var renewed = _cluster.Current.Certificates.Values.Single();
        Assert.Equal((first.Id, CertificateEventKind.Renewed), (renewed.Id, renewed.History[0].Kind));
        Assert.NotEqual(first.Material!.Thumbprint, renewed.Material!.Thumbprint);
    }

    [Fact]
    public async Task One_ACME_account_is_made_and_kept_for_every_certificate()
    {
        await IssueAsync();

        await _issuer.IssueAsync("blog.example.com", null, CertificateRenewal.IssueAction, TestContext.Current.CancellationToken);

        Assert.Equal(1, _acme.AccountsCreated);
        Assert.True(_cluster.Current.AcmeAccounts.ContainsKey(AcmeOptions.LetsEncryptStaging));
    }

    [Fact]
    public async Task The_challenge_is_shared_with_every_replica_while_ACME_checks_it()
    {
        AcmeChallenge? during = null;
        _acme.WhileCompleting = () =>
        {
            during = _cluster.Current.AcmeChallenges.Values.Single();
            return Task.CompletedTask;
        };

        await IssueAsync();

        Assert.Equal((Host, "token-1.thumbprint"), (during?.Host, during?.KeyAuthorization));
        Assert.Empty(_cluster.Current.AcmeChallenges);
    }

    [Fact]
    public async Task The_lock_is_released_after_issuing()
    {
        await IssueAsync();

        Assert.Empty(_cluster.Current.Locks);
    }

    [Fact]
    public async Task A_failure_is_recorded_and_retried_after_5_minutes()
    {
        _acme.Failure = new AcmeException(AcmeErrors.ChallengeFailed, "Connection refused");

        var result = await IssueAsync();

        var certificate = _cluster.Current.Certificates.Values.Single();
        Assert.Equal((AcmeErrors.ChallengeFailed, "Connection refused"), (result!.FailureCode, result.FailureDetail));
        Assert.Equal((1, TestClock.Now.AddMinutes(5), CertificateEventKind.Failed), (certificate.FailedAttempts, certificate.NextAttemptAt, certificate.History[0].Kind));
        Assert.Equal(AuditOutcome.Failed, _cluster.Current.Audit.Single().Outcome);
    }

    [Fact]
    public async Task A_failed_renewal_keeps_the_current_certificate()
    {
        await IssueAsync();
        var issued = _cluster.Current.Certificates.Values.Single().Material;
        _acme.Failure = new AcmeException(AcmeErrors.RateLimited, "Too many certificates");

        await IssueAsync();

        Assert.Equal(issued, _cluster.Current.Certificates.Values.Single().Material);
    }

    [Fact]
    public async Task A_success_after_failures_resets_the_retries()
    {
        _acme.Failure = new AcmeException(AcmeErrors.ChallengeFailed, null);
        await IssueAsync();
        _acme.Failure = null;

        await IssueAsync();

        var certificate = _cluster.Current.Certificates.Values.Single();
        Assert.Equal((0, (DateTimeOffset?)null), (certificate.FailedAttempts, certificate.NextAttemptAt));
    }

    [Fact]
    public async Task An_unexpected_error_is_recorded_as_a_rejection()
    {
        _acme.WhileCompleting = () => throw new InvalidOperationException("Boom");

        var result = await IssueAsync();

        Assert.Equal((AcmeErrors.Rejected, "Boom"), (result!.FailureCode, result.FailureDetail));
        Assert.Empty(_cluster.Current.Locks);
    }

    [Fact]
    public async Task A_certificate_another_replica_is_getting_isn_t_ordered_twice()
    {
        _cluster.Current = _cluster.Current.With(new LockTaken(new StateLock("certificate:" + Host, "replica-b", TestClock.Now.AddMinutes(5)), TestClock.Now));

        Assert.Null(await IssueAsync());
        Assert.Empty(_acme.Ordered);
    }

    [Fact]
    public async Task An_expired_lock_doesn_t_stop_issuing()
    {
        _cluster.Current = _cluster.Current.With(new LockTaken(new StateLock("certificate:" + Host, "replica-b", TestClock.Now.AddMinutes(-1)), TestClock.Now.AddMinutes(-11)));

        Assert.True((await IssueAsync())!.Succeeded);
    }

    [Fact]
    public async Task The_same_host_isn_t_issued_twice_at_once_on_one_replica()
    {
        IssueResult? overlapping = null;
        _acme.WhileCompleting = async () => overlapping = await IssueAsync();

        await IssueAsync();

        Assert.Null(overlapping);
        Assert.Single(_acme.Ordered);
    }

    private Task<IssueResult?> IssueAsync() =>
        _issuer.IssueAsync(Host, null, CertificateRenewal.IssueAction, TestContext.Current.CancellationToken);
}
