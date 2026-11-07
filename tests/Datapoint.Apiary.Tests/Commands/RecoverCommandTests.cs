using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.Recovery;
using Datapoint.Apiary.Commands;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using Microsoft.AspNetCore.Http;
using static Datapoint.Apiary.Testing.Builders.RecoveryBuilders;

namespace Datapoint.Apiary.Tests.Commands;

[Collection(nameof(ProcessWide))]
public sealed class RecoverCommandTests : IDisposable
{
    private readonly TemporaryDirectory _data = new();

    public void Dispose() => _data.Dispose();

    [Fact]
    public async Task Without_force_it_explains_itself_and_changes_nothing()
    {
        using var shell = new OperatorShell(adminPort: 1, _data.Path);

        var exit = await RecoverCommand.RunAsync([]);

        Assert.Equal(2, exit);
        Assert.Contains("Usage: apiary recover --force", shell.Error);
    }

    [Fact]
    public async Task A_standalone_replica_has_nothing_to_recover()
    {
        await using var app = await ApiaryApp.StartAsync();
        await AdminSession.UserAsync(app);
        using var shell = new OperatorShell(app.AdminPort, app.DataDirectory);

        var exit = await RecoverCommand.RunAsync(["--force"]);

        Assert.Equal(1, exit);
        Assert.Contains("This replica (node-a)", shell.Output);
        Assert.Contains("ana@example.com (Ana): Administrator, Active", shell.Output);
        Assert.Contains("nothing to recover", shell.Error);
    }

    [Fact]
    public async Task The_plan_describes_this_replica_s_state()
    {
        await using var api = await OperatorAsync(ARecoveryPlan(index: 10) with { Survivors = [ASurvivor(index: 9)] });
        using var shell = new OperatorShell(api.Port, _data.Path);

        await RecoverCommand.RunAsync(["--force", "--yes"]);

        Assert.Contains("This replica (node-a) has the state up to index 10; its last change was at 2026-11-04 12:00 UTC.", shell.Output);
        Assert.Contains("Also reachable: node-b at 10.0.0.2, index 9.", shell.Output);
    }

    [Fact]
    public async Task A_wrong_operator_token_is_refused()
    {
        await using var api = await OperatorAsync(ARecoveryPlan(), token: "someone else's token");
        using var shell = new OperatorShell(api.Port, _data.Path);

        var exit = await RecoverCommand.RunAsync(["--force", "--yes"]);

        Assert.Equal((1, 0), (exit, api.Starts));
        Assert.Contains("Apiary refused to plan a recovery (403).", shell.Error);
    }

    [Fact]
    public async Task A_survivor_in_a_cluster_with_a_majority_stops_the_recovery()
    {
        await using var api = await OperatorAsync(ARecoveryPlan(index: 10) with { Needed = false, Survivors = [ASurvivor(index: 10, writable: true)] });
        using var shell = new OperatorShell(api.Port, _data.Path);

        var exit = await RecoverCommand.RunAsync(["--force", "--yes"]);

        Assert.Equal((1, 0), (exit, api.Starts));
        Assert.Contains("The replica on node-b is in a cluster that has a majority", shell.Error);
    }

    [Fact]
    public async Task A_survivor_with_more_changes_stops_the_recovery()
    {
        await using var api = await OperatorAsync(ARecoveryPlan(index: 10) with { Survivors = [ASurvivor(index: 12)] });
        using var shell = new OperatorShell(api.Port, _data.Path);

        var exit = await RecoverCommand.RunAsync(["--force", "--yes"]);

        Assert.Equal((1, 0), (exit, api.Starts));
        Assert.Contains("The replica on node-b has more changes.", shell.Error);
    }

    [Fact]
    public async Task Anything_but_the_confirmation_word_changes_nothing()
    {
        await using var api = await OperatorAsync(ARecoveryPlan());
        using var shell = new OperatorShell(api.Port, _data.Path, typed: "yes\n");

        var exit = await RecoverCommand.RunAsync(["--force"]);

        Assert.Equal((1, 0), (exit, api.Starts));
        Assert.Contains("Nothing was changed.", shell.Error);
    }

    [Fact]
    public async Task Without_a_terminal_to_confirm_on_nothing_changes()
    {
        await using var api = await OperatorAsync(ARecoveryPlan());
        using var shell = new OperatorShell(api.Port, _data.Path, typed: "");

        var exit = await RecoverCommand.RunAsync(["--force"]);

        Assert.Equal((1, 0), (exit, api.Starts));
        Assert.Contains("Nothing was changed.", shell.Error);
    }

    [Fact]
    public async Task Typing_the_confirmation_word_starts_the_recovery()
    {
        await using var api = await OperatorAsync(ARecoveryPlan());
        using var shell = new OperatorShell(api.Port, _data.Path, typed: "recover\n");

        var exit = await RecoverCommand.RunAsync(["--force"]);

        Assert.Equal((0, 1), (exit, api.Starts));
        Assert.Contains("Type \"recover\"", shell.Output);
        Assert.Contains("Apiary is restarting as the only member of a new cluster.", shell.Output);
    }

    [Fact]
    public async Task Yes_starts_the_recovery_without_asking()
    {
        await using var api = await OperatorAsync(ARecoveryPlan());
        using var shell = new OperatorShell(api.Port, _data.Path);

        var exit = await RecoverCommand.RunAsync(["--force", "--yes"]);

        Assert.Equal((0, 1), (exit, api.Starts));
        Assert.DoesNotContain("Type \"recover\"", shell.Output);
    }

    [Fact]
    public async Task A_refused_start_is_reported_with_apiary_s_answer()
    {
        await using var api = await OperatorAsync(ARecoveryPlan(), startStatus: StatusCodes.Status409Conflict);
        using var shell = new OperatorShell(api.Port, _data.Path);

        var exit = await RecoverCommand.RunAsync(["--force", "--yes"]);

        Assert.Equal(1, exit);
        Assert.Contains("Apiary refused the recovery:", shell.Error);
        Assert.Contains(RecoveryRefusedException.NotMostRecent, shell.Error);
    }

    private async Task<FakeOperatorApi> OperatorAsync(RecoveryPlan plan, string token = FakeOperatorApi.Token, int startStatus = StatusCodes.Status202Accepted)
    {
        await File.WriteAllTextAsync(LocalOperatorToken.PathIn(_data.Path), token + "\n", TestContext.Current.CancellationToken);
        return await FakeOperatorApi.StartAsync(plan, startStatus: startStatus);
    }
}
