using Datapoint.Apiary.Auth;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Hosting;

namespace Datapoint.Apiary.Commands;

public static class OperatorClient
{
    public static async Task<HttpClient> CreateAsync()
    {
        var configuration = Configuration();
        var cluster = configuration.Get<ClusterOptions>() ?? new ClusterOptions();
        var token = await File.ReadAllTextAsync(LocalOperatorToken.PathIn(cluster.DataDirectory));
        var client = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{AdminPort()}/") };
        client.DefaultRequestHeaders.Authorization = new("Local", token.Trim());
        return client;
    }

    public static int AdminPort() => (Configuration().Get<ApiaryOptions>() ?? new ApiaryOptions()).AdminPort;

    public static string? Option(IReadOnlyList<string> args, string name)
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

    private static IConfigurationSection Configuration() =>
        new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build()
            .GetSection("Apiary");
}
