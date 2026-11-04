using System.Net;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Acme;
using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class ProxyTests : IAsyncLifetime
{
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
    public async Task A_request_reaches_the_route_s_target_with_its_original_host()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        var answer = await BackendAnswerAsync("http://shop.example.com/cart?id=1");

        Assert.Equal(("web", "/cart?id=1", "shop.example.com"), (Text(answer, "backend"), Text(answer, "path"), Text(answer["headers"]!, "host")));
    }

    [Fact]
    public async Task The_target_learns_the_visitor_s_address_and_scheme()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync("http://shop.example.com/"))["headers"]!;

        Assert.Equal(("127.0.0.1", "http"), (Text(headers, "x-forwarded-for"), Text(headers, "x-forwarded-proto")));
    }

    [Fact]
    public async Task The_longest_matching_path_wins()
    {
        await using var blog = await Backend.StartAsync("blog");
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)), new RouteSaved(RouteTo(blog) with { Path = "/blog" }));

        var answers = (Text(await BackendAnswerAsync("http://shop.example.com/blog/post"), "backend"), Text(await BackendAnswerAsync("http://shop.example.com/blogger"), "backend"));

        Assert.Equal(("blog", "web"), answers);
    }

    [Fact]
    public async Task An_unknown_hostname_gets_the_not_found_page()
    {
        using var response = await GetAsync("http://nobody.example.com/");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task A_disabled_route_answers_503()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Disabled = true }));

        using var response = await GetAsync("http://shop.example.com/");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task A_route_in_maintenance_shows_its_message()
    {
        var window = new MaintenanceWindow(DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddHours(1), "Back at noon");
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Maintenance = window }));

        using var response = await GetAsync("http://shop.example.com/");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("Back at noon", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_maintenance_message_can_t_inject_markup()
    {
        var window = new MaintenanceWindow(DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddHours(1), "<script>alert(1)</script>");
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Maintenance = window }));

        using var response = await GetAsync("http://shop.example.com/");

        Assert.DoesNotContain("<script>alert", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_address_outside_the_allowlist_gets_a_403()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { AllowedAddresses = ["10.0.0.0/8"] }));

        using var response = await GetAsync("http://shop.example.com/");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task An_address_inside_the_allowlist_gets_through()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { AllowedAddresses = ["127.0.0.0/8"] }));

        Assert.Equal("web", Text(await BackendAnswerAsync("http://shop.example.com/"), "backend"));
    }

    [Fact]
    public async Task Requests_beyond_the_rate_limit_get_a_429_with_when_to_retry()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { RateLimit = 2 }));
        (await GetAsync("http://shop.example.com/")).Dispose();
        (await GetAsync("http://shop.example.com/")).Dispose();

        using var response = await GetAsync("http://shop.example.com/");

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.NotNull(response.Headers.RetryAfter);
    }

    [Fact]
    public async Task A_redirect_keeps_the_path()
    {
        await _app.SeedAsync(new RedirectSaved(ARedirect(from: "www.example.com", to: "https://example.com")));

        using var response = await GetAsync("http://www.example.com/about?x=1");

        Assert.Equal((HttpStatusCode.MovedPermanently, "https://example.com/about?x=1"), (response.StatusCode, response.Headers.Location?.ToString()));
    }

    [Fact]
    public async Task A_canary_header_reaches_the_last_target()
    {
        await using var next = await Backend.StartAsync("next");
        var route = RouteTo(_web) with
        {
            Targets = [new RouteTarget(_web.Address.ToString(), _web.Port, 100), new RouteTarget(next.Address.ToString(), next.Port, 0)],
            Canary = new RouteCanary(CanarySource.Header, "X-Canary", "yes"),
        };
        await _app.SeedAsync(new RouteSaved(route));

        var answers = (Text(await BackendAnswerAsync("http://shop.example.com/", ("X-Canary", "yes")), "backend"), Text(await BackendAnswerAsync("http://shop.example.com/"), "backend"));

        Assert.Equal(("next", "web"), answers);
    }

    [Fact]
    public async Task The_admin_session_cookie_never_reaches_a_target()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        var headers = (await BackendAnswerAsync("http://shop.example.com/", ("Cookie", "apiary_session=secret; cart=42")))["headers"]!;

        Assert.Equal("cart=42", Text(headers, "cookie"));
    }

    [Fact]
    public async Task A_target_on_loopback_is_refused()
    {
        await _app.SeedAsync(new RouteSaved(ARoute(host: "shop.example.com") with { Targets = [new RouteTarget("127.0.0.1", _app.AdminPort, 100)] }));

        using var response = await GetAsync("http://shop.example.com/api/auth/me");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task A_password_protected_route_is_only_served_over_HTTPS()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Password = APassword() }));

        using var response = await GetAsync("http://shop.example.com/");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task ACME_checks_get_the_key_authorization_for_their_host()
    {
        await _app.SeedAsync(new AcmeChallengesAdded([AChallenge("abc123", "shop.example.com") with { ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(5) }]));

        using var right = await GetAsync("http://shop.example.com/.well-known/acme-challenge/abc123");
        using var wrong = await GetAsync("http://other.example.com/.well-known/acme-challenge/abc123");

        Assert.Equal((HttpStatusCode.OK, HttpStatusCode.NotFound), (right.StatusCode, wrong.StatusCode));
        Assert.Equal(AChallenge("abc123", "shop.example.com").KeyAuthorization, await right.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    private static Route RouteTo(Backend backend) =>
        ARoute(host: "shop.example.com") with { Targets = [new RouteTarget(backend.Address.ToString(), backend.Port, 100)] };

    private static RoutePassword APassword() =>
        new(PasswordHasher.Hash("a demo password"), SecretTokens.New(), DateTimeOffset.UtcNow, null, 7);

    private async Task<HttpResponseMessage> GetAsync(string url, params (string Name, string Value)[] headers)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        foreach (var (name, value) in headers)
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private async Task<JsonNode> BackendAnswerAsync(string url, params (string Name, string Value)[] headers)
    {
        using var response = await GetAsync(url, headers);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"{url} answered {(int)response.StatusCode}: {text}");
        return JsonNode.Parse(text)!;
    }

    private static string? Text(JsonNode node, string name) => node[name]?.GetValue<string>();
}
