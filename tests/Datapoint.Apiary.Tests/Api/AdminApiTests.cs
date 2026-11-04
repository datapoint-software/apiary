using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Tests.Hosting;

namespace Datapoint.Apiary.Tests.Api;

public sealed class AdminApiTests : IAsyncLifetime
{
    private ApiaryApp _app = null!;

    public async ValueTask InitializeAsync() => _app = await ApiaryApp.StartAsync();

    public async ValueTask DisposeAsync() => await _app.DisposeAsync();

    [Fact]
    public async Task Signing_in_with_a_password_and_a_code_opens_a_session()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var me = await AdminSession.PostAsync(client, "auth/me");

        Assert.Equal("ana@example.com", me["email"]!.GetValue<string>());
    }

    [Fact]
    public async Task The_API_needs_a_session()
    {
        using var client = Clients.Admin(_app);

        var (status, problem) = await ProblemAsync(client, "projects/list");

        Assert.Equal((HttpStatusCode.Unauthorized, "auth.required"), (status, problem["code"]?.GetValue<string>()));
    }

    [Fact]
    public async Task A_role_without_permission_gets_a_403()
    {
        using var client = await AdminSession.SignedInAsync(_app, Role.Viewer);

        var (status, _) = await ProblemAsync(client, "projects/create", new JsonObject { ["name"] = "Shop" });

        Assert.Equal(HttpStatusCode.Forbidden, status);
    }

    [Fact]
    public async Task Invalid_fields_are_listed_with_their_codes()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await ProblemAsync(client, "projects/create", new JsonObject { ["name"] = " " });

        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Contains(problem["errors"]!.AsArray(), e => e!["field"]?.GetValue<string>() == "name" && e["code"]?.GetValue<string>() == "required");
    }

    [Fact]
    public async Task Something_that_doesn_t_exist_gets_a_404_with_its_code()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await ProblemAsync(client, "routes/delete", new JsonObject { ["id"] = Guid.NewGuid() });

        Assert.Equal((HttpStatusCode.NotFound, "route.notFound"), (status, problem["code"]?.GetValue<string>()));
    }

    [Fact]
    public async Task An_unknown_API_address_gets_a_404()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await ProblemAsync(client, "nothing/here");

        Assert.Equal((HttpStatusCode.NotFound, "request.notFound"), (status, problem["code"]?.GetValue<string>()));
    }

    [Fact]
    public async Task A_request_from_another_site_is_refused()
    {
        using var client = await AdminSession.SignedInAsync(_app);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/projects/create") { Content = JsonContent.Create(new JsonObject { ["name"] = "Shop" }) };
        request.Headers.Add("Sec-Fetch-Site", "cross-site");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.DoesNotContain(_app.State.Projects.Values, p => p.Name == "Shop");
    }

    [Fact]
    public async Task A_request_from_another_origin_is_refused()
    {
        using var client = await AdminSession.SignedInAsync(_app);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/projects/create") { Content = JsonContent.Create(new JsonObject { ["name"] = "Shop" }) };
        request.Headers.Add("Origin", "https://evil.example.com");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_change_through_the_API_is_saved_and_audited_with_the_caller_s_address()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        await AdminSession.PostAsync(client, "projects/create", new JsonObject { ["name"] = "Shop" });

        var entry = _app.State.Audit.Last();
        Assert.Equal(("projects.create", "ana@example.com", "127.0.0.1"), (entry.Action, entry.User, entry.Address));
        Assert.Single(_app.State.Projects.Values, p => p.Name == "Shop");
    }

    [Fact]
    public async Task The_session_cookie_is_secure_and_hidden_from_scripts()
    {
        await AdminSession.UserAsync(_app);
        using var client = Clients.Admin(_app, useCookies: false);
        var step = await AdminSession.PostAsync(client, "auth/sign-in", new JsonObject { ["email"] = "ana@example.com", ["password"] = AdminSession.Password });

        using var response = await client.PostAsJsonAsync(new Uri("/api/auth/verify", UriKind.Relative), new JsonObject { ["challenge"] = step["challenge"]!.GetValue<string>(), ["code"] = AdminSession.CurrentCode() }, TestContext.Current.CancellationToken);

        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("apiary_session=", StringComparison.Ordinal)).ToLowerInvariant();
        Assert.Contains("secure", cookie, StringComparison.Ordinal);
        Assert.Contains("httponly", cookie, StringComparison.Ordinal);
        Assert.Contains("samesite=strict", cookie, StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_admin_interface_can_t_be_framed_and_limits_scripts()
    {
        using var client = Clients.Admin(_app);

        using var response = await client.GetAsync(new Uri("/health/live", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Contains("frame-ancestors 'none'", response.Headers.GetValues("Content-Security-Policy").Single(), StringComparison.Ordinal);
        Assert.Contains("script-src 'self'", response.Headers.GetValues("Content-Security-Policy").Single(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_admin_API_isn_t_served_on_the_public_port()
    {
        using var client = Clients.Public(_app);

        using var response = await client.PostAsJsonAsync(new Uri("http://shop.example.com/api/auth/me"), new JsonObject(), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static async Task<(HttpStatusCode Status, JsonNode Problem)> ProblemAsync(HttpClient client, string action, JsonObject? body = null)
    {
        using var response = await client.PostAsJsonAsync(new Uri("/api/" + action, UriKind.Relative), body ?? [], TestContext.Current.CancellationToken);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return (response.StatusCode, JsonNode.Parse(text.Length == 0 ? "{}" : text)!);
    }
}
