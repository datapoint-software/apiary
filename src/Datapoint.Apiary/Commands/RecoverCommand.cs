using System.Globalization;
using System.Text.Json;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Recovery;

namespace Datapoint.Apiary.Commands;

public static class RecoverCommand
{
    private const string Confirmation = "recover";

    private static readonly JsonSerializerOptions s_planJson = new(ApiJson.Options) { RespectRequiredConstructorParameters = false };

    public static async Task<int> RunAsync(IReadOnlyList<string> args)
    {
        if (!args.Contains("--force", StringComparer.Ordinal))
        {
            await Console.Error.WriteLineAsync(
                "Usage: apiary recover --force [--yes]\n\n" +
                "Makes this replica the only member of a new cluster, when most replicas are lost for good.\n" +
                "Changes that only the lost replicas had are lost, and everyone is signed out.\n" +
                "Prefer restoring a recent backup when you have one.");
            return 2;
        }

        using var client = await OperatorClient.CreateAsync();
        using var planResponse = await client.PostAsync("operator/recovery/plan", content: null);
        if (!planResponse.IsSuccessStatusCode)
        {
            await Console.Error.WriteLineAsync($"Apiary refused to plan a recovery ({(int)planResponse.StatusCode}).");
            return 1;
        }

        var plan = (await planResponse.Content.ReadFromJsonAsync<RecoveryPlan>(s_planJson))!;
        Describe(plan);
        if (plan.Survivors.FirstOrDefault(s => s.Writable) is { } writable)
        {
            await Console.Error.WriteLineAsync($"\nThe replica on {writable.Node} is in a cluster that has a majority, so this one is only cut off from it. Restart this replica so it rejoins, instead of recovering.");
            return 1;
        }

        if (!plan.Needed)
        {
            await Console.Error.WriteLineAsync("\nThis replica can write, or isn't in a Swarm, or hasn't joined a cluster yet, so there's nothing to recover.");
            return 1;
        }

        if (plan.Survivors.FirstOrDefault(s => s.Index > plan.Index) is { } ahead)
        {
            await Console.Error.WriteLineAsync($"\nThe replica on {ahead.Node} has more changes. Run this command in that replica's container instead.");
            return 1;
        }

        if (!args.Contains("--yes", StringComparer.Ordinal))
        {
            Console.Write($"\nType \"{Confirmation}\" to make this replica the only member of a new cluster: ");
            if (Console.ReadLine()?.Trim() != Confirmation)
            {
                await Console.Error.WriteLineAsync("Nothing was changed.");
                return 1;
            }
        }

        using var startResponse = await client.PostAsync("operator/recovery/start", content: null);
        if (!startResponse.IsSuccessStatusCode)
        {
            await Console.Error.WriteLineAsync($"Apiary refused the recovery: {await startResponse.Content.ReadAsStringAsync()}");
            return 1;
        }

        Console.WriteLine(
            "\nApiary is restarting as the only member of a new cluster. When it's back:\n" +
            "  1. Sign in again: every session was ended.\n" +
            "  2. Review the users and roles above, and redo recent changes that are missing.\n" +
            "  3. The other replicas notice the new cluster, set their old state aside and rejoin as new replicas.\n" +
            "  4. Take a backup.");
        return 0;
    }

    private static void Describe(RecoveryPlan plan)
    {
        var lastChange = plan.LastChangeAt is { } at ? at.ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture) : "unknown";
        Console.WriteLine($"This replica ({plan.Node}) has the state up to index {plan.Index}; its last change was at {lastChange}.");
        foreach (var survivor in plan.Survivors)
        {
            Console.WriteLine($"  Also reachable: {survivor.Node} at {survivor.Address}, index {survivor.Index}.");
        }

        Console.WriteLine("\nUsers and roles in this state:");
        foreach (var user in plan.Users)
        {
            Console.WriteLine($"  {user.Email} ({user.Name}): {user.Role}, {user.Status}");
        }
    }
}
