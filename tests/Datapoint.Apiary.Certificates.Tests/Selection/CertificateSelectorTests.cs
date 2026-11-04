using System.Security.Authentication;
using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Certificates.Selection;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Testing.Certificates;
using Microsoft.Extensions.Logging.Abstractions;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.Selection;

public sealed class CertificateSelectorTests : IDisposable
{
    private readonly FakeClusterState _cluster = new();
    private readonly CertificateSelector _selector;

    public CertificateSelectorTests() => _selector = new CertificateSelector(_cluster, NullLogger<CertificateSelector>.Instance);

    public void Dispose()
    {
        _selector.Dispose();
        _cluster.Dispose();
    }

    [Fact]
    public async Task A_route_s_host_is_served_with_its_automatic_certificate()
    {
        await AppendAsync(new RouteSaved(ARoute(host: "shop.example.com")), new CertificateSaved(Automatic("shop.example.com")));

        Assert.NotNull(_selector.OptionsFor("shop.example.com").ServerCertificateContext);
    }

    [Fact]
    public async Task Hostnames_match_regardless_of_case()
    {
        await AppendAsync(new RouteSaved(ARoute(host: "shop.example.com")), new CertificateSaved(Automatic("shop.example.com")));

        Assert.True(_selector.Has("SHOP.Example.com"));
    }

    [Fact]
    public async Task A_route_with_an_uploaded_certificate_is_served_with_it()
    {
        var uploaded = Uploaded("*.example.com");
        await AppendAsync(new CertificateSaved(uploaded), new RouteSaved(ARoute(host: "shop.example.com") with { CertificateId = uploaded.Id }));

        Assert.True(_selector.Has("shop.example.com"));
    }

    [Fact]
    public async Task An_uploaded_certificate_serves_only_the_routes_that_use_it()
    {
        var uploaded = Uploaded("*.example.com");
        await AppendAsync(new CertificateSaved(uploaded), new RouteSaved(ARoute(host: "blog.example.com")));

        Assert.False(_selector.Has("blog.example.com"));
    }

    [Fact]
    public async Task A_certificate_that_doesn_t_cover_the_host_isn_t_served()
    {
        var uploaded = Uploaded("other.example.com");
        await AppendAsync(new CertificateSaved(uploaded), new RouteSaved(ARoute(host: "shop.example.com") with { CertificateId = uploaded.Id }));

        Assert.False(_selector.Has("shop.example.com"));
    }

    [Fact]
    public async Task A_redirect_s_host_is_served_with_its_automatic_certificate()
    {
        await AppendAsync(new RedirectSaved(ARedirect(from: "www.example.com")), new CertificateSaved(Automatic("www.example.com")));

        Assert.True(_selector.Has("www.example.com"));
    }

    [Fact]
    public async Task A_certificate_that_isn_t_used_by_a_route_isn_t_served()
    {
        await AppendAsync(new CertificateSaved(Automatic("shop.example.com")));

        Assert.False(_selector.Has("shop.example.com"));
    }

    [Fact]
    public async Task A_new_certificate_is_served_as_soon_as_it_s_saved()
    {
        await AppendAsync(new RouteSaved(ARoute(host: "shop.example.com")));
        var before = _selector.Has("shop.example.com");

        await AppendAsync(new CertificateSaved(Automatic("shop.example.com")));

        Assert.Equal((false, true), (before, _selector.Has("shop.example.com")));
    }

    [Fact]
    public void A_hostname_without_a_certificate_fails_the_handshake()
    {
        Assert.Throws<AuthenticationException>(() => _selector.OptionsFor("unknown.example.com"));
    }

    [Fact]
    public void A_handshake_without_a_hostname_fails()
    {
        Assert.Throws<AuthenticationException>(() => _selector.OptionsFor(null));
    }

    [Fact]
    public async Task A_certificate_that_can_t_be_loaded_isn_t_served()
    {
        var broken = Automatic("shop.example.com");
        await AppendAsync(new RouteSaved(ARoute(host: "shop.example.com")), new CertificateSaved(broken with { Material = broken.Material! with { KeyPem = "broken" } }));

        Assert.False(_selector.Has("shop.example.com"));
    }

    private static Certificate Automatic(string host) => ACertificate(host) with { Material = Material(host) };

    private static Certificate Uploaded(string host) => ACertificate(host) with { Source = CertificateSource.Uploaded, Material = Material(host) };

    private static CertificateMaterial Material(string host)
    {
        var bundle = TestCertificates.SelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(30), host);
        return CertificateBundle.Check(bundle.ChainPem, bundle.KeyPem, DateTimeOffset.UtcNow).Material!;
    }

    private async Task AppendAsync(params IStateChange[] changes) =>
        await _cluster.AppendAsync(AnEntry(changes), TestContext.Current.CancellationToken);
}
