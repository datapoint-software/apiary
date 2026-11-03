using System.Text.Json;
using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Hosting;

namespace Datapoint.Apiary.Commands;

public static class CreateAdminCommand
{
    public static async Task<int> RunAsync(IReadOnlyList<string> args)
    {
        var name = Option(args, "--name");
        var email = Option(args, "--email");
        if (name is null || email is null)
        {
            await Console.Error.WriteLineAsync("Usage: apiary users create-admin --name <name> --email <email> [--url <admin url>]");
            return 2;
        }

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build()
            .GetSection("Apiary");
        var cluster = configuration.Get<ClusterOptions>() ?? new ClusterOptions();
        var apiary = configuration.Get<ApiaryOptions>() ?? new ApiaryOptions();
        var token = await File.ReadAllTextAsync(LocalOperatorToken.PathIn(cluster.DataDirectory));

        using var client = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{apiary.AdminPort}/") };
        client.DefaultRequestHeaders.Authorization = new("Local", token.Trim());
        using var response = await client.PostAsJsonAsync("api/users/create-admin", new { name, email });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (!response.IsSuccessStatusCode)
        {
            await Console.Error.WriteLineAsync($"Apiary refused it: {body}");
            return 1;
        }

        var url = (Option(args, "--url") ?? $"http://localhost:{apiary.AdminPort}").TrimEnd('/');
        Console.WriteLine($"Open this link within 15 minutes to set the password and two-step sign-in for {email}:");
        Console.WriteLine($"{url}/invite/{body.GetProperty("token").GetString()}");
        return 0;
    }

    private static string? Option(IReadOnlyList<string> args, string name)
    {
        for (var i = 0; i < args.Count - 1; i++)
        {
            if (args[i] == name)
            {
                return args[i + 1];
            }
        }

        return null;
    }
}
