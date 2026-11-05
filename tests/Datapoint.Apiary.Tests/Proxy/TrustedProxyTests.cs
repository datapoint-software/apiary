using System.Net;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Proxies;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Proxy.Telemetry;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Tests.Hosting;
using Microsoft.Extensions.DependencyInjection;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

/// <summary>The tests connect from 127.0.0.1, so trusting it makes the test client a proxy in front of Apiary.</summary>
public sealed class TrustedProxyTests : IAsyncLifetime
{
    private static readonly TrustedProxy s_loopback = new(Guid.CreateVersion7(), "127.0.0.1", "The tests");
    private ApiaryApp _app = null!;
    private Backend _web = null!;
    private HttpClient _client = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _web = await Backend.StartAsync("web");
        _client = Clients.Public(_app);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _web.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task The_target_gets_the_proxy_s_chain_with_the_proxy_added()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync(("X-Forwarded-For", "203.0.113.9")))["headers"]!;

        Assert.Equal("203.0.113.9, 127.0.0.1", Text(headers, "x-forwarded-for"));
    }

    [Fact]
    public async Task The_target_gets_the_scheme_the_proxy_reports()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync(("X-Forwarded-For", "203.0.113.9"), ("X-Forwarded-Proto", "https")))["headers"]!;

        Assert.Equal("https", Text(headers, "x-forwarded-proto"));
    }

    [Fact]
    public async Task The_target_never_gets_the_host_the_proxy_reports()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync(("X-Forwarded-For", "203.0.113.9"), ("X-Forwarded-Host", "evil.example")))["headers"]!;

        Assert.Equal("shop.example.com", Text(headers, "x-forwarded-host"));
    }

    [Fact]
    public async Task Headers_a_trusted_proxy_sets_reach_the_target()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync(("X-Forwarded-For", "203.0.113.9"), ("CF-Connecting-IP", "203.0.113.9")))["headers"]!;

        Assert.Equal("203.0.113.9", Text(headers, "cf-connecting-ip"));
    }

    [Fact]
    public async Task An_allowlist_checks_the_client_behind_a_trusted_proxy()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web) with { AllowedAddresses = ["203.0.113.0/24"] }));

        using var response = await GetAsync(("X-Forwarded-For", "203.0.113.9"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task An_allowlist_ignores_the_chain_of_a_proxy_that_isn_t_trusted()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { AllowedAddresses = ["203.0.113.0/24"] }));

        using var response = await GetAsync(("X-Forwarded-For", "203.0.113.9"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_chain_that_can_t_be_read_counts_as_the_proxy_itself()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync(("X-Forwarded-For", "unknown"), ("CF-Connecting-IP", "203.0.113.9")))["headers"]!;

        Assert.Equal(("127.0.0.1", null), (Text(headers, "x-forwarded-for"), Text(headers, "cf-connecting-ip")));
    }

    [Fact]
    public async Task A_password_protected_route_is_served_when_the_proxy_reports_HTTPS()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web) with { Password = APassword() }));

        using var response = await GetAsync(("X-Forwarded-For", "203.0.113.9"), ("X-Forwarded-Proto", "https"));

        Assert.NotEqual(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Each_trusted_proxy_reports_its_latest_request()
    {
        await _app.SeedAsync(new TrustedProxySaved(s_loopback), new RouteSaved(RouteTo(_web)));

        using var response = await GetAsync(("X-Forwarded-For", "203.0.113.9"));

        var snapshot = _app.Services.GetRequiredService<RouteTelemetrySource>().Snapshot().Single(s => s.RouteId == s_loopback.Id);
        Assert.NotNull(snapshot.LastConnectionAt);
    }

    private static Route RouteTo(Backend backend) =>
        ARoute(host: "shop.example.com") with { Targets = [new RouteTarget(backend.Address.ToString(), backend.Port, 100)] };

    private static RoutePassword APassword() =>
        new(PasswordHasher.Hash("a demo password"), SecretTokens.New(), DateTimeOffset.UtcNow, null, 7);

    private async Task<HttpResponseMessage> GetAsync(params (string Name, string Value)[] headers)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "http://shop.example.com/");
        foreach (var (name, value) in headers)
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private async Task<JsonNode> BackendAnswerAsync(params (string Name, string Value)[] headers)
    {
        using var response = await GetAsync(headers);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"answered {(int)response.StatusCode}: {text}");
        return JsonNode.Parse(text)!;
    }

    private static string? Text(JsonNode node, string name) => node[name]?.GetValue<string>();
}
