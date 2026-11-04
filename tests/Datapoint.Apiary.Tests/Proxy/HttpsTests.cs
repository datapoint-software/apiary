using System.Net;
using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Proxy.Passwords;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Testing.Certificates;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class HttpsTests : IAsyncLifetime
{
    private const string LinkKey = "a-link-key-of-enough-length-123";
    private ApiaryApp _app = null!;
    private Backend _web = null!;
    private HttpClient _http = null!;
    private HttpClient _https = null!;
    private Certificate _certificate = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _web = await Backend.StartAsync("web");
        _http = Clients.Public(_app);
        _https = Clients.Public(_app, https: true);
        var bundle = TestCertificates.SelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(30), "shop.example.com");
        _certificate = ACertificate("shop.example.com") with
        {
            Source = CertificateSource.Uploaded,
            Material = CertificateBundle.Check(bundle.ChainPem, bundle.KeyPem, DateTimeOffset.UtcNow, requireCompleteChain: false).Material,
        };
        await _app.SeedAsync(new CertificateSaved(_certificate));
    }

    public async ValueTask DisposeAsync()
    {
        _http.Dispose();
        _https.Dispose();
        await _web.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task A_route_with_a_certificate_is_served_over_HTTPS()
    {
        await _app.SeedAsync(new RouteSaved(Route()));

        using var response = await _https.GetAsync(new Uri("https://shop.example.com/"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Plain_HTTP_is_sent_to_HTTPS_when_there_s_a_certificate()
    {
        await _app.SeedAsync(new RouteSaved(Route()));

        using var response = await _http.GetAsync(new Uri("http://shop.example.com/cart?id=1"), TestContext.Current.CancellationToken);

        Assert.Equal((HttpStatusCode.PermanentRedirect, "https://shop.example.com/cart?id=1"), (response.StatusCode, response.Headers.Location?.ToString()));
    }

    [Fact]
    public async Task A_hostname_without_a_certificate_fails_the_TLS_handshake()
    {
        await _app.SeedAsync(new RouteSaved(Route()));

        await Assert.ThrowsAsync<HttpRequestException>(() => _https.GetAsync(new Uri("https://other.example.com/"), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Strict_transport_is_sent_only_when_the_route_asks_for_it()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { StrictTransport = true, StrictTransportSubdomains = true }));

        using var response = await _https.GetAsync(new Uri("https://shop.example.com/"), TestContext.Current.CancellationToken);

        Assert.Equal("max-age=31536000; includeSubDomains", response.Headers.GetValues("Strict-Transport-Security").Single());
    }

    [Fact]
    public async Task A_password_protected_route_asks_for_the_password()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { Password = Password() }));

        using var response = await _https.GetAsync(new Uri("https://shop.example.com/"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains(PasswordGate.PasswordField, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_right_password_lets_a_visitor_in_with_a_cookie()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { Password = Password() }));
        using var form = new FormUrlEncodedContent([new(PasswordGate.PasswordField, "a demo password"), new(PasswordGate.GateField, "1")]);

        using var response = await _https.PostAsync(new Uri("https://shop.example.com/"), form, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.SeeOther, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith(PasswordCookie.Prefix, StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_wrong_password_shows_the_page_again()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { Password = Password() }));
        using var form = new FormUrlEncodedContent([new(PasswordGate.PasswordField, "a wrong password"), new(PasswordGate.GateField, "1")]);

        using var response = await _https.PostAsync(new Uri("https://shop.example.com/"), form, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Opening_a_sign_in_link_asks_to_confirm_first()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { Password = WithLink() }));

        using var response = await _https.GetAsync(new Uri("https://shop.example.com/?apiary-key=" + LinkKey), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Confirming_a_sign_in_link_lets_a_visitor_in_and_drops_the_key_from_the_address()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { Password = WithLink() }));
        using var form = new FormUrlEncodedContent([new(PasswordGate.GateField, "1")]);

        using var response = await _https.PostAsync(new Uri("https://shop.example.com/docs?apiary-key=" + LinkKey), form, TestContext.Current.CancellationToken);

        Assert.Equal((HttpStatusCode.SeeOther, "https://shop.example.com/docs"), (response.StatusCode, response.Headers.Location?.ToString()));
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith(PasswordCookie.Prefix, StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_wrong_link_key_doesn_t_let_anyone_in()
    {
        await _app.SeedAsync(new RouteSaved(Route() with { Password = WithLink() }));
        using var form = new FormUrlEncodedContent([new(PasswordGate.GateField, "1")]);

        using var response = await _https.PostAsync(new Uri("https://shop.example.com/?apiary-key=another-key-of-enough-length-1"), form, TestContext.Current.CancellationToken);

        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    private Route Route() =>
        ARoute(host: "shop.example.com") with { CertificateId = _certificate.Id, Targets = [new RouteTarget(_web.Address.ToString(), _web.Port, 100)] };

    private static RoutePassword WithLink() => Password() with { Link = new RouteLink(SecretTokens.Hash(LinkKey), DateTimeOffset.UtcNow) };

    private static RoutePassword Password() =>
        new(PasswordHasher.Hash("a demo password"), SecretTokens.New(), DateTimeOffset.UtcNow, null, 7);
}
