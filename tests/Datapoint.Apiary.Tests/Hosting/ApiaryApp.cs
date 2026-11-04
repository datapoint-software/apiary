using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class ApiaryApp : WebApplicationFactory<Program>
{
    private readonly TemporaryDirectory _directory = new();

    public int HttpPort { get; } = FreePort();

    public int HttpsPort { get; } = FreePort();

    public int AdminPort { get; } = FreePort();

    public int RaftPort { get; } = FreePort();

    public int ClusterPort { get; } = FreePort();

    public IReadOnlyDictionary<string, string> Settings { get; init; } = new Dictionary<string, string>(StringComparer.Ordinal);

    public Action<IServiceCollection> TestServices { get; init; } = _ => { };

    public string DataDirectory => Path.Combine(_directory.Path, "data");

    public RaftClusterState Cluster => Services.GetRequiredService<RaftClusterState>();

    public ApiaryState State => Cluster.Current;

    public static Task<ApiaryApp> StartAsync(IReadOnlyDictionary<string, string>? settings = null, int attempts = 3) =>
        StartAsync(() => new ApiaryApp { Settings = settings ?? new Dictionary<string, string>(StringComparer.Ordinal) }, attempts);

    public static async Task<ApiaryApp> StartAsync(Func<ApiaryApp> create, int attempts = 3, TimeSpan? readyWithin = null)
    {
        var app = create();
        app.UseKestrel();
        try
        {
            app.StartServer();
        }
        catch (IOException exception) when (exception.InnerException is AddressInUseException && attempts > 1)
        {
            await app.DisposeAsync();
            return await StartAsync(create, attempts - 1, readyWithin);
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(readyWithin ?? TimeSpan.FromSeconds(30));
        await app.Cluster.WaitUntilReadyAsync(timeout.Token);
        return app;
    }

    public async Task SeedAsync(params IStateChange[] changes) =>
        await Cluster.AppendAsync(AnEntry(changes), TestContext.Current.CancellationToken);

    public static int FreePort() => FreePorts.Next();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Apiary:HttpPort", Text(HttpPort));
        builder.UseSetting("Apiary:HttpsPort", Text(HttpsPort));
        builder.UseSetting("Apiary:AdminPort", Text(AdminPort));
        builder.UseSetting("Apiary:RaftPort", Text(RaftPort));
        builder.UseSetting("Apiary:ClusterPort", Text(ClusterPort));
        builder.UseSetting("Apiary:Mode", "Standalone");
        builder.UseSetting("Apiary:NodeName", "node-a");
        builder.UseSetting("Apiary:DataDirectory", DataDirectory);
        builder.UseSetting("Apiary:KeyDirectory", Path.Combine(_directory.Path, "keys"));
        builder.UseSetting("Apiary:RootKeyFile", Path.Combine(_directory.Path, "none"));
        builder.UseSetting("Apiary:Acme:DirectoryUrl", "https://127.0.0.1:1/directory");
        foreach (var (key, value) in Settings)
        {
            builder.UseSetting(key, value);
        }

        builder.ConfigureTestServices(TestServices);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing)
        {
            return;
        }

        _directory.Dispose();
    }

    private static string Text(int port) => port.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
