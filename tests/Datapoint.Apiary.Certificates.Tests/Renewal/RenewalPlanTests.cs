using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.Renewal;

public sealed class RenewalPlanTests
{
    [Fact]
    public void Routes_and_redirects_want_automatic_certificates()
    {
        var state = ApiaryState.Empty.With(
            new RouteSaved(ARoute(host: "shop.example.com")),
            new RouteSaved(ARoute(host: "uploaded.example.com") with { CertificateId = Guid.NewGuid() }),
            new RedirectSaved(ARedirect(from: "www.example.com")));

        Assert.Equal(["shop.example.com", "www.example.com"], RenewalPlan.WantedHosts(state).Order(StringComparer.Ordinal));
    }

    [Theory]
    [InlineData("localhost")]
    [InlineData("shop.localhost")]
    [InlineData("SHOP.LOCALHOST")]
    public void Local_hostnames_never_want_a_certificate(string host)
    {
        var state = ApiaryState.Empty.With(new RouteSaved(ARoute(host: host)));

        Assert.Empty(RenewalPlan.WantedHosts(state));
    }

    [Fact]
    public void A_certificate_renews_when_a_third_of_its_lifetime_is_left()
    {
        var material = SomeMaterial("shop.example.com") with { NotBefore = TestClock.Now, NotAfter = TestClock.Now.AddDays(90) };

        Assert.Equal(TestClock.Now.AddDays(60), RenewalPlan.RenewsFrom(material));
    }

    [Fact]
    public void A_host_without_a_certificate_is_due()
    {
        var state = ApiaryState.Empty.With(new RouteSaved(ARoute(host: "shop.example.com")));

        Assert.Equal(["shop.example.com"], RenewalPlan.Due(state, TestClock.Now));
    }

    [Fact]
    public void A_certificate_isn_t_due_before_its_renewal_window()
    {
        var state = WithCertificate(ACertificate("shop.example.com") with { Material = Fresh() });

        Assert.Empty(RenewalPlan.Due(state, TestClock.Now.AddDays(59)));
    }

    [Fact]
    public void A_certificate_is_due_in_its_renewal_window()
    {
        var state = WithCertificate(ACertificate("shop.example.com") with { Material = Fresh() });

        Assert.Equal(["shop.example.com"], RenewalPlan.Due(state, TestClock.Now.AddDays(60)));
    }

    [Fact]
    public void A_failed_certificate_waits_for_its_retry_time()
    {
        var state = WithCertificate(ACertificate("shop.example.com") with { FailedAttempts = 1, NextAttemptAt = TestClock.Now.AddMinutes(5) });

        Assert.Equal((0, 1), (RenewalPlan.Due(state, TestClock.Now).Count, RenewalPlan.Due(state, TestClock.Now.AddMinutes(5)).Count));
    }

    [Fact]
    public void Due_hosts_are_in_order()
    {
        var state = ApiaryState.Empty.With(new RouteSaved(ARoute(host: "b.example.com")), new RouteSaved(ARoute(host: "a.example.com")));

        Assert.Equal(["a.example.com", "b.example.com"], RenewalPlan.Due(state, TestClock.Now));
    }

    [Theory]
    [InlineData(1, 5)]
    [InlineData(2, 15)]
    [InlineData(3, 60)]
    [InlineData(4, 360)]
    [InlineData(10, 360)]
    public void Retries_back_off_with_each_failure(int attempts, int minutes)
    {
        Assert.Equal(TimeSpan.FromMinutes(minutes), RenewalPlan.RetryAfter(attempts, AcmeErrors.ChallengeFailed));
    }

    [Fact]
    public void An_unreachable_ACME_server_is_retried_every_5_minutes()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), RenewalPlan.RetryAfter(10, AcmeErrors.Unreachable));
    }

    [Fact]
    public void An_unreachable_DNS_provider_is_retried_soon()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), RenewalPlan.RetryAfter(10, DnsErrors.Unreachable));
    }

    [Fact]
    public void A_DNS_failure_never_reaches_ACME_s_limits()
    {
        var certificate = ACertificate().WithEvent(AnEvent(CertificateEventKind.Failed) with { Code = DnsErrors.NotPropagated });

        Assert.False(RenewalPlan.LastFailureReachedAcme(certificate));
    }

    [Fact]
    public void A_requested_certificate_is_due_without_a_route()
    {
        var state = WithCertificate(ACertificate("*.example.com") with { Requested = true });

        Assert.Equal(["*.example.com"], RenewalPlan.Due(state, TestClock.Now));
    }

    [Fact]
    public void A_failure_that_never_reached_ACME_doesn_t_count_against_its_limits()
    {
        var certificate = ACertificate().WithEvent(AnEvent(CertificateEventKind.Failed) with { Code = AcmeErrors.Unreachable });

        Assert.False(RenewalPlan.LastFailureReachedAcme(certificate));
    }

    private static ApiaryState WithCertificate(Certificate certificate) =>
        ApiaryState.Empty.With(new RouteSaved(ARoute(host: certificate.Name)), new CertificateSaved(certificate));

    private static CertificateMaterial Fresh() =>
        SomeMaterial("shop.example.com") with { NotBefore = TestClock.Now, NotAfter = TestClock.Now.AddDays(90) };
}
