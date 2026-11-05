using System.Net;
using System.Net.Http.Headers;
using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Commands;
using Datapoint.Apiary.Management.Stacks;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Commands;

[Collection(nameof(ProcessWide))]
public sealed class ApplyCommandTests : IDisposable
{
    private const string StackFile = """
        services:
          web:
            deploy:
              labels:
                apiary.route.site.host: shop.example.com
                apiary.route.site.port: 8080
        """;

    private readonly TemporaryDirectory _directory = new();

    public void Dispose() => _directory.Dispose();

    [Fact]
    public async Task It_applies_the_labels_and_prints_the_plan()
    {
        await using var app = await ApiaryApp.StartAsync();
        var token = await PipelineTokenAsync(app);
        using var shell = new OperatorShell(app.AdminPort, app.DataDirectory);

        var exit = await ApplyCommand.RunAsync([File(StackFile), "--stack", "shop", "--server", Server(app), "--certificate-sha256", await FingerprintAsync(app)], Variables(token, ("APIARY_COMMIT", "4f2a9c1")));

        Assert.Equal(0, exit);
        Assert.Contains("+ route shop.example.com", shell.Output);
        Assert.Contains("Applied: 1 to add, 0 to change, 0 to remove.", shell.Output);
        var route = Assert.Single(app.State.Routes.Values);
        Assert.Equal(("shop.example.com", "shop_web"), (route.Host, route.Targets[0].Host));
        Assert.Equal("4f2a9c1", app.State.Stacks["shop"].LastApply?.Commit);
    }

    [Fact]
    public async Task A_dry_run_prints_the_plan_and_changes_nothing()
    {
        await using var app = await ApiaryApp.StartAsync();
        var token = await PipelineTokenAsync(app);
        using var shell = new OperatorShell(app.AdminPort, app.DataDirectory);

        var exit = await ApplyCommand.RunAsync([File(StackFile), "--stack", "shop", "--server", Server(app), "--dry-run", "--certificate-sha256", await FingerprintAsync(app)], Variables(token));

        Assert.Equal(0, exit);
        Assert.Contains("Plan: 1 to add, 0 to change, 0 to remove. Nothing was applied.", shell.Output);
        Assert.Contains("found no commit or pipeline link", shell.Error);
        Assert.Empty(app.State.Routes);
    }

    [Fact]
    public async Task A_token_Apiary_doesn_t_know_is_refused()
    {
        await using var app = await ApiaryApp.StartAsync();
        using var shell = new OperatorShell(app.AdminPort, app.DataDirectory);

        var exit = await ApplyCommand.RunAsync([File(StackFile), "--stack", "shop", "--server", Server(app), "--certificate-sha256", await FingerprintAsync(app)], Variables(PipelineTokens.Prefix + "unknown"));

        Assert.Equal(1, exit);
        Assert.Contains("Apiary refused it: auth.invalidToken", shell.Error);
    }

    [Fact]
    public async Task A_certificate_with_another_fingerprint_is_not_trusted()
    {
        await using var app = await ApiaryApp.StartAsync();
        var token = await PipelineTokenAsync(app);
        using var shell = new OperatorShell(app.AdminPort, app.DataDirectory);

        var exit = await ApplyCommand.RunAsync([File(StackFile), "--stack", "shop", "--server", Server(app), "--certificate-sha256", new string('0', 64)], Variables(token));

        Assert.Equal(1, exit);
        Assert.Contains("Couldn't reach Apiary", shell.Error);
        Assert.Empty(app.State.Routes);
    }

    [Fact]
    public async Task A_pipeline_token_is_refused_by_the_rest_of_the_API()
    {
        await using var app = await ApiaryApp.StartAsync();
        var token = await PipelineTokenAsync(app);
        using var client = Clients.Admin(app);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.PostAsync(new Uri("api/routes/list", UriKind.Relative), System.Net.Http.Json.JsonContent.Create(new { }), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Mistakes_in_the_labels_stop_it_before_it_calls_Apiary()
    {
        using var shell = new OperatorShell(adminPort: 1, _directory.Path);

        var exit = await ApplyCommand.RunAsync([File(StackFile.Replace("site.port", "site.prot", StringComparison.Ordinal)), "--stack", "shop", "--server", "https://127.0.0.1:1"], Variables("apiary_pt_x"));

        Assert.Equal(2, exit);
        Assert.Contains("web: apiary.route.site.prot isn't a setting Apiary reads from labels.", shell.Error);
    }

    [Fact]
    public async Task Without_a_token_it_explains_itself()
    {
        using var shell = new OperatorShell(adminPort: 1, _directory.Path);

        var exit = await ApplyCommand.RunAsync([File(StackFile), "--stack", "shop", "--server", "https://127.0.0.1:1"], _ => null);

        Assert.Equal(2, exit);
        Assert.Contains("Usage: apiary apply <stack file>", shell.Error);
    }

    private static async Task<string> PipelineTokenAsync(ApiaryApp app)
    {
        var (token, value) = PipelineTokens.Create("shop-deploy", "shop", 90, DateTimeOffset.UtcNow, "ana@example.com");
        await app.SeedAsync(new StackSaved(AStack()), new PipelineTokenSaved(token));
        return value;
    }


    private static async Task<string> FingerprintAsync(ApiaryApp app)
    {
        Assert.True(await Eventually.TrueAsync(() => app.State.AdminCertificate is not null));
        return app.State.AdminCertificate!.Fingerprint;
    }

    private static string Server(ApiaryApp app) => $"https://127.0.0.1:{app.AdminPort}";

    private static Func<string, string?> Variables(string token, params (string Name, string Value)[] others)
    {
        var variables = others.ToDictionary(v => v.Name, v => v.Value, StringComparer.Ordinal);
        variables["APIARY_TOKEN"] = token;
        return variables.GetValueOrDefault;
    }

    private string File(string content)
    {
        var path = Path.Combine(_directory.Path, "stack.yml");
        System.IO.File.WriteAllText(path, content);
        return path;
    }
}
