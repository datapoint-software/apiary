using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Certificates;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Routes;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Certificates;

public sealed class CertificateRequestTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly DnsProvider _provider = ADnsProvider("example.com");

    public CertificateRequestTests()
    {
        _host.SignedIn(Role.Operator);
        _host.Seed(new DnsProviderSaved(_provider));
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_operator_requests_a_wildcard_with_its_base_name()
    {
        var id = await _host.SendAsync(new RequestCertificate(["*.Example.com", "example.com"], _provider.Id));

        var certificate = _host.State.Certificates[id];
        Assert.Equal(["*.example.com", "example.com"], certificate.Names);
        Assert.Equal((_provider.Id, true), (certificate.DnsProviderId, certificate.Requested));
    }

    [Fact]
    public async Task A_wildcard_needs_a_DNS_provider()
    {
        Assert.Contains($"DnsProviderId: {ErrorCodes.CertificateWildcardNeedsDns}", await _host.ErrorsAsync(new RequestCertificate(["*.example.com"])));
    }

    [Fact]
    public async Task The_provider_must_prove_every_name()
    {
        Assert.Contains(
            $"DnsProviderId: {ErrorCodes.CertificateProviderDoesNotCover}",
            await _host.ErrorsAsync(new RequestCertificate(["*.example.com", "example.org"], _provider.Id)));
    }

    [Theory]
    [InlineData("shop.*.example.com")]
    [InlineData("**.example.com")]
    [InlineData("10.0.0.1")]
    public async Task A_wildcard_can_only_be_the_first_part(string name)
    {
        Assert.Contains($"Names: {ErrorCodes.CertificateNameInvalid}", await _host.ErrorsAsync(new RequestCertificate([name], _provider.Id)));
    }

    [Fact]
    public async Task A_name_with_a_certificate_already_is_refused()
    {
        _host.Seed(new CertificateSaved(ACertificate("*.example.com")));

        Assert.Contains($"Names: {ErrorCodes.CertificateExists}", await _host.ErrorsAsync(new RequestCertificate(["*.example.com"], _provider.Id)));
    }

    [Fact]
    public async Task A_route_s_hostname_can_be_checked_with_DNS_before_its_first_certificate()
    {
        await _host.SendAsync(new SetCertificateChallenge("grafana.example.com", _provider.Id));

        var certificate = Assert.Single(_host.State.Certificates.Values);
        Assert.Equal(("grafana.example.com", _provider.Id, false), (certificate.Name, certificate.DnsProviderId, certificate.Requested));
    }

    [Fact]
    public async Task Changing_the_challenge_keeps_the_certificate()
    {
        var existing = ACertificate("shop.example.com") with { DnsProviderId = _provider.Id };
        _host.Seed(new CertificateRequested(existing));

        await _host.SendAsync(new SetCertificateChallenge("shop.example.com", null));

        Assert.Null(_host.State.Certificates[existing.Id].DnsProviderId);
    }

    [Fact]
    public async Task A_wildcard_can_t_go_back_to_HTTP_01()
    {
        _host.Seed(new CertificateRequested(ACertificate("*.example.com") with { DnsProviderId = _provider.Id, Requested = true }));

        Assert.Contains($"DnsProviderId: {ErrorCodes.CertificateWildcardNeedsDns}", await _host.ErrorsAsync(new SetCertificateChallenge("*.example.com", null)));
    }

    [Fact]
    public async Task Every_route_on_a_hostname_switches_to_the_wildcard()
    {
        var wildcard = ACertificate("*.example.com") with { DnsProviderId = _provider.Id, Requested = true };
        var root = ARoute(host: "www.example.com");
        var api = ARoute(host: "www.example.com") with { Path = "/api" };
        _host.Seed(new CertificateRequested(wildcard), new RouteSaved(root), new RouteSaved(api));

        await _host.SendAsync(new UseCertificate(wildcard.Id, ["www.example.com"]));

        Assert.All(_host.State.Routes.Values, r => Assert.Equal(wildcard.Id, r.CertificateId));
    }

    [Fact]
    public async Task A_wildcard_doesn_t_cover_a_second_level()
    {
        var wildcard = ACertificate("*.example.com") with { DnsProviderId = _provider.Id, Requested = true };
        _host.Seed(new CertificateRequested(wildcard), new RouteSaved(ARoute(host: "a.b.example.com")));

        Assert.Contains($"Hosts: {ErrorCodes.CertificateDoesNotCover}", await _host.ErrorsAsync(new UseCertificate(wildcard.Id, ["a.b.example.com"])));
    }

    [Fact]
    public async Task A_route_can_name_a_requested_wildcard()
    {
        var wildcard = ACertificate("*.example.com") with { DnsProviderId = _provider.Id, Requested = true };
        _host.Seed(new CertificateRequested(wildcard));
        var project = _host.AProjectIn();

        var errors = await _host.ErrorsAsync(new CreateRoute(project.Id, "blog.example.com", "/", [ATarget()]) { CertificateId = wildcard.Id });

        Assert.Empty(errors);
    }
}
