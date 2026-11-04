using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.Renewal;

public sealed class CertificateRenewalTests : IAsyncDisposable
{
    private readonly FakeTimeProvider _time = TestClock.Fake();
    private readonly FakeClusterState _cluster = new();
    private readonly FakeAcme _acme;
    private readonly CertificateRenewal _renewal;

    public CertificateRenewalTests()
    {
        _acme = new FakeAcme(_time);
        var issuer = new CertificateIssuer(_cluster, _acme, Options.Create(new AcmeOptions()), _time, NullLogger<CertificateIssuer>.Instance);
        _renewal = new CertificateRenewal(_cluster, issuer, _time, NullLogger<CertificateRenewal>.Instance);
    }

    public async ValueTask DisposeAsync()
    {
        await _renewal.StopAsync(CancellationToken.None);
        _renewal.Dispose();
        _acme.Dispose();
        _cluster.Dispose();
    }

    [Fact]
    public async Task A_new_route_gets_a_certificate()
    {
        _cluster.Current = _cluster.Current.With(new RouteSaved(ARoute(host: "shop.example.com")));

        await _renewal.StartAsync(TestContext.Current.CancellationToken);

        Assert.True(await Eventually.TrueAsync(() => _cluster.Current.Certificates.Values.Any(c => c.Material is not null)));
    }

    [Fact]
    public async Task A_follower_leaves_certificates_to_the_leader()
    {
        _cluster.IsLeader = false;
        _cluster.Current = _cluster.Current.With(new RouteSaved(ARoute(host: "shop.example.com")));

        await _renewal.StartAsync(TestContext.Current.CancellationToken);
        await _cluster.AppendAsync(AnEntry(), TestContext.Current.CancellationToken);
        await Task.Delay(TimeSpan.FromMilliseconds(200), TestContext.Current.CancellationToken);

        Assert.Empty(_acme.Ordered);
    }

    [Fact]
    public async Task A_certificate_no_route_uses_is_marked_unused()
    {
        _cluster.Current = _cluster.Current.With(new CertificateSaved(ACertificate("old.example.com") with { Material = SomeMaterial("old.example.com") }));

        await _renewal.StartAsync(TestContext.Current.CancellationToken);

        Assert.True(await Eventually.TrueAsync(() => _cluster.Current.Certificates.Values.Single().UnusedSince == TestClock.Now));
    }

    [Fact]
    public async Task An_unused_certificate_is_deleted_after_30_days()
    {
        var unused = ACertificate("old.example.com") with { Material = SomeMaterial("old.example.com"), UnusedSince = TestClock.Now.AddDays(-31) };
        _cluster.Current = _cluster.Current.With(new CertificateSaved(unused));

        await _renewal.StartAsync(TestContext.Current.CancellationToken);

        Assert.True(await Eventually.TrueAsync(() => _cluster.Current.Certificates.IsEmpty));
    }

    [Fact]
    public async Task A_certificate_used_again_is_no_longer_unused()
    {
        var unused = ACertificate("shop.example.com") with { Material = SomeMaterial("shop.example.com") with { NotAfter = TestClock.Now.AddDays(80) }, UnusedSince = TestClock.Now.AddDays(-1) };
        _cluster.Current = _cluster.Current.With(new CertificateSaved(unused), new RouteSaved(ARoute(host: "shop.example.com")));

        await _renewal.StartAsync(TestContext.Current.CancellationToken);

        Assert.True(await Eventually.TrueAsync(() => _cluster.Current.Certificates.Values.Single().UnusedSince is null));
    }

    [Fact]
    public async Task Expired_challenges_are_cleaned_up()
    {
        _cluster.Current = _cluster.Current.With(new AcmeChallengesAdded([AChallenge("stale", "shop.example.com") with { ExpiresAt = TestClock.Now.AddMinutes(-1) }]));

        await _renewal.StartAsync(TestContext.Current.CancellationToken);

        Assert.True(await Eventually.TrueAsync(() => _cluster.Current.AcmeChallenges.IsEmpty));
    }
}
