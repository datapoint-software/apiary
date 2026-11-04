using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Tests.Hosting;

namespace Datapoint.Apiary.Tests.Agents;

public sealed class AgentAccessTests : IAsyncLifetime
{
    private const string Callback = "http://127.0.0.1:33418/callback";
    private static readonly string[] s_withheld = ["export", "restore", "upload", "check", "update-policy", "update_policy"];
    private readonly string _verifier = Base64Url.Encode(RandomNumberGenerator.GetBytes(32));
    private ApiaryApp _app = null!;

    public async ValueTask InitializeAsync() => _app = await ApiaryApp.StartAsync();

    public async ValueTask DisposeAsync() => await _app.DisposeAsync();

    [Fact]
    public async Task The_server_describes_where_agents_sign_in()
    {
        using var client = Clients.Admin(_app);

        var metadata = await client.GetFromJsonAsync<JsonObject>(new Uri("/.well-known/oauth-authorization-server", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal($"https://127.0.0.1:{_app.AdminPort}/oauth/token", metadata!["token_endpoint"]!.GetValue<string>());
        Assert.Equal("S256", metadata["code_challenge_methods_supported"]![0]!.GetValue<string>());
    }

    [Fact]
    public async Task A_client_can_t_register_a_redirect_to_another_website()
    {
        using var client = Clients.Admin(_app);

        using var response = await client.PostAsJsonAsync(new Uri("/oauth/register", UriKind.Relative), new JsonObject { ["client_name"] = "Claude Code", ["redirect_uris"] = new JsonArray("https://evil.example.com/callback") }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_redirect_uri", (await response.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken))!["error"]!.GetValue<string>());
    }

    [Fact]
    public async Task MCP_without_a_token_points_to_the_resource_metadata()
    {
        using var client = Clients.Admin(_app);

        using var response = await client.PostAsJsonAsync(new Uri("/mcp", UriKind.Relative), ToolsList(), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("resource_metadata=", response.Headers.WwwAuthenticate.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_connected_agent_lists_its_tools_but_never_backups_or_private_keys()
    {
        var token = await ConnectAsync(Role.Administrator);

        var tools = await McpAsync(token, ToolsList());

        var names = tools["result"]!["tools"]!.AsArray().Select(t => t!["name"]!.GetValue<string>()).ToList();
        Assert.Contains(names, n => n.Contains("routes", StringComparison.Ordinal));
        Assert.DoesNotContain(names, n => s_withheld.Any(w => n.Contains(w, StringComparison.Ordinal)));
    }

    [Fact]
    public async Task An_agent_acts_with_its_user_s_role()
    {
        var token = await ConnectAsync(Role.Viewer);
        var tools = await McpAsync(token, ToolsList());
        var create = tools["result"]!["tools"]!.AsArray().Select(t => t!["name"]!.GetValue<string>()).First(n => n.Contains("projects", StringComparison.Ordinal) && n.Contains("create", StringComparison.Ordinal));

        var result = await McpAsync(token, ToolCall(create, new JsonObject { ["name"] = "Shop" }));

        Assert.True(result["result"]!["isError"]!.GetValue<bool>());
        Assert.Contains("forbidden", result["result"]!["content"]![0]!["text"]!.GetValue<string>(), StringComparison.Ordinal);
        Assert.DoesNotContain(_app.State.Projects.Values, p => p.Name == "Shop");
    }

    [Fact]
    public async Task A_revoked_token_no_longer_works()
    {
        var (token, clientId) = await ConnectWithClientAsync(Role.Administrator);
        using var client = Clients.Admin(_app);
        using var form = new FormUrlEncodedContent([new("token", token), new("client_id", clientId)]);
        (await client.PostAsync(new Uri("/oauth/revoke", UriKind.Relative), form, TestContext.Current.CancellationToken)).Dispose();

        using var response = await PostMcpAsync(token, ToolsList());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_disabled_user_s_agent_is_shut_out()
    {
        var token = await ConnectAsync(Role.Operator);
        var user = _app.State.Users.Values.Single(u => u.Role is Role.Operator);
        await _app.SeedAsync(new UserSaved(user with { Status = UserStatus.Disabled }));

        using var response = await PostMcpAsync(token, ToolsList());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task<string> ConnectAsync(Role role) => (await ConnectWithClientAsync(role)).Token;

    private async Task<(string Token, string ClientId)> ConnectWithClientAsync(Role role)
    {
        using var anonymous = Clients.Admin(_app);
        using var registered = await anonymous.PostAsJsonAsync(new Uri("/oauth/register", UriKind.Relative), new JsonObject { ["client_name"] = "Claude", ["redirect_uris"] = new JsonArray(Callback) }, TestContext.Current.CancellationToken);
        var clientId = (await registered.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken))!["client_id"]!.GetValue<string>();
        using var user = await AdminSession.SignedInAsync(_app, role, role.ToString().ToLowerInvariant() + "@example.com");
        var challenge = Base64Url.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(_verifier)));
        var connected = await AdminSession.PostAsync(user, "agents/connect", new JsonObject { ["clientId"] = clientId, ["redirectUri"] = Callback, ["codeChallenge"] = challenge, ["codeChallengeMethod"] = "S256" });
        var code = System.Web.HttpUtility.ParseQueryString(new Uri(connected["redirectTo"]!.GetValue<string>()).Query)["code"]!;
        using var form = new FormUrlEncodedContent([new("grant_type", "authorization_code"), new("client_id", clientId), new("code", code), new("code_verifier", _verifier), new("redirect_uri", Callback)]);
        using var tokens = await anonymous.PostAsync(new Uri("/oauth/token", UriKind.Relative), form, TestContext.Current.CancellationToken);
        var body = (await tokens.Content.ReadFromJsonAsync<JsonObject>(TestContext.Current.CancellationToken))!;
        return (body["access_token"]!.GetValue<string>(), clientId);
    }

    private async Task<HttpResponseMessage> PostMcpAsync(string token, JsonObject message)
    {
        using var client = Clients.Admin(_app, useCookies: false);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/mcp") { Content = JsonContent.Create(message) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Accept.ParseAdd("application/json");
        request.Headers.Accept.ParseAdd("text/event-stream");
        return await client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private async Task<JsonNode> McpAsync(string token, JsonObject message)
    {
        using var response = await PostMcpAsync(token, message);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"MCP answered {(int)response.StatusCode}: {text}");
        var json = text.Split('\n').Select(l => l.Trim()).Where(l => l.StartsWith("data:", StringComparison.Ordinal)).Select(l => l[5..].Trim()).LastOrDefault() ?? text;
        return JsonNode.Parse(json)!;
    }

    private static JsonObject ToolsList() => new() { ["jsonrpc"] = "2.0", ["id"] = 1, ["method"] = "tools/list" };

    private static JsonObject ToolCall(string name, JsonObject arguments) =>
        new() { ["jsonrpc"] = "2.0", ["id"] = 2, ["method"] = "tools/call", ["params"] = new JsonObject { ["name"] = name, ["arguments"] = arguments } };
}
