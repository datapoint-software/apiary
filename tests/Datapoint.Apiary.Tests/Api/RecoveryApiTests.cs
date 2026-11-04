using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Tests.Hosting;

namespace Datapoint.Apiary.Tests.Api;

public sealed class RecoveryApiTests : IAsyncLifetime
{
    private ApiaryApp _app = null!;

    public async ValueTask InitializeAsync() => _app = await ApiaryApp.StartAsync();

    public async ValueTask DisposeAsync() => await _app.DisposeAsync();

    [Fact]
    public async Task The_recovery_plan_needs_a_session()
    {
        using var client = Clients.Admin(_app);

        var (status, problem) = await PostAsync(client, "cluster/recovery-plan");

        Assert.Equal((HttpStatusCode.Unauthorized, "auth.required"), (status, Code(problem)));
    }

    [Fact]
    public async Task The_local_operator_token_doesn_t_open_the_recovery_wizard()
    {
        using var client = Clients.Admin(_app);
        var token = await File.ReadAllTextAsync(LocalOperatorToken.PathIn(_app.DataDirectory), TestContext.Current.CancellationToken);
        client.DefaultRequestHeaders.Authorization = new("Local", token.Trim());

        var (status, problem) = await PostAsync(client, "cluster/recovery-plan");

        Assert.Equal((HttpStatusCode.Unauthorized, "auth.required"), (status, Code(problem)));
    }

    [Fact]
    public async Task Only_administrators_see_the_recovery_plan()
    {
        using var client = await AdminSession.SignedInAsync(_app, Role.Operator);

        var (status, problem) = await PostAsync(client, "cluster/recovery-plan");

        Assert.Equal((HttpStatusCode.Forbidden, "auth.forbidden"), (status, Code(problem)));
    }

    [Fact]
    public async Task The_recovery_plan_names_this_replica_and_its_users()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, plan) = await PostAsync(client, "cluster/recovery-plan");

        Assert.Equal((HttpStatusCode.OK, false, "node-a"), (status, plan["needed"]!.GetValue<bool>(), plan["node"]!.GetValue<string>()));
        Assert.Equal("ana@example.com", plan["users"]![0]!["email"]!.GetValue<string>());
    }

    [Fact]
    public async Task A_recovery_with_the_password_and_a_fresh_code_reaches_the_cluster_which_has_nothing_to_recover()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, AdminSession.NextCode());

        Assert.Equal((HttpStatusCode.Conflict, "cluster.recoveryNotNeeded"), (status, Code(problem)));
    }

    [Fact]
    public async Task A_recovery_meant_for_another_replica_is_refused()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, AdminSession.NextCode(), node: "node-b");

        Assert.Equal((HttpStatusCode.Conflict, "cluster.otherReplica"), (status, Code(problem)));
    }

    [Fact]
    public async Task A_wrong_password_is_reported_on_the_password_field()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await RecoverAsync(client, "not the password", AdminSession.NextCode());

        Assert.Equal((HttpStatusCode.BadRequest, "password", "password.incorrect"), (status, Field(problem), FieldCode(problem)));
    }

    [Fact]
    public async Task A_wrong_code_is_reported_on_the_code_field()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, "000000x");

        Assert.Equal((HttpStatusCode.BadRequest, "code", "code.invalid"), (status, Field(problem), FieldCode(problem)));
    }

    [Fact]
    public async Task The_code_used_to_sign_in_can_t_start_a_recovery()
    {
        using var client = await AdminSession.SignedInAsync(_app);

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, AdminSession.CurrentCode());

        Assert.Equal((HttpStatusCode.BadRequest, "code.invalid"), (status, FieldCode(problem)));
    }

    [Fact]
    public async Task A_code_can_t_be_used_twice()
    {
        using var client = await AdminSession.SignedInAsync(_app);
        var code = AdminSession.NextCode();
        await RecoverAsync(client, AdminSession.Password, code);

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, code);

        Assert.Equal((HttpStatusCode.BadRequest, "code.invalid"), (status, FieldCode(problem)));
    }

    [Fact]
    public async Task A_newer_code_is_accepted_after_a_recovery_attempt()
    {
        using var client = await AdminSession.SignedInAsync(_app, code: AdminSession.PreviousCode());
        await RecoverAsync(client, AdminSession.Password, AdminSession.CurrentCode());

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, AdminSession.NextCode());

        Assert.Equal((HttpStatusCode.Conflict, "cluster.recoveryNotNeeded"), (status, Code(problem)));
    }

    [Fact]
    public async Task Repeated_failures_are_throttled()
    {
        using var client = await AdminSession.SignedInAsync(_app);
        await RecoverAsync(client, "wrong 1", AdminSession.NextCode());
        await RecoverAsync(client, "wrong 2", AdminSession.NextCode());
        await RecoverAsync(client, "wrong 3", AdminSession.NextCode());
        await RecoverAsync(client, "wrong 4", AdminSession.NextCode());

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, AdminSession.NextCode());

        Assert.Equal((HttpStatusCode.TooManyRequests, "auth.throttled"), (status, Code(problem)));
    }

    [Fact]
    public async Task An_administrator_without_two_step_sign_in_can_t_start_a_recovery()
    {
        using var client = await AdminSession.SignedInAsync(_app);
        var user = _app.State.Users.Values.Single(u => u.Email == "ana@example.com");
        await _app.SeedAsync(new UserSaved(user with { TwoStep = null }));

        var (status, problem) = await RecoverAsync(client, AdminSession.Password, AdminSession.NextCode());

        Assert.Equal((HttpStatusCode.Forbidden, "auth.forbidden"), (status, Code(problem)));
    }

    private static string? Code(JsonNode problem) => problem["code"]?.GetValue<string>();

    private static string? Field(JsonNode problem) => problem["errors"]?[0]?["field"]?.GetValue<string>();

    private static string? FieldCode(JsonNode problem) => problem["errors"]?[0]?["code"]?.GetValue<string>();

    private static Task<(HttpStatusCode Status, JsonNode Body)> RecoverAsync(HttpClient client, string password, string code, string node = "node-a") =>
        PostAsync(client, "cluster/recover", new JsonObject { ["node"] = node, ["password"] = password, ["code"] = code });

    private static async Task<(HttpStatusCode Status, JsonNode Body)> PostAsync(HttpClient client, string path, JsonObject? body = null)
    {
        using var response = await client.PostAsJsonAsync(new Uri("/api/" + path, UriKind.Relative), body ?? [], TestContext.Current.CancellationToken);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return (response.StatusCode, JsonNode.Parse(text.Length == 0 ? "{}" : text)!);
    }
}
