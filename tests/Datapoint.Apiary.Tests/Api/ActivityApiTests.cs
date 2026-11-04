using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Api;

public sealed class ActivityApiTests : IAsyncLifetime
{
    private ApiaryApp _app = null!;
    private Backend _web = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _web = await Backend.StartAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await _web.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task Proxied_requests_and_their_errors_show_in_the_last_hour_s_activity()
    {
        var target = _web.Address.ToString();
        await _app.SeedAsync(
            new RouteSaved(ARoute(host: "shop.example.com") with { Targets = [new RouteTarget(target, _web.Port, 100)] }),
            new RouteSaved(ARoute(host: "down.example.com") with { Targets = [new RouteTarget(target, ApiaryApp.FreePort(), 100)] }));
        using var visitor = Clients.Public(_app);
        await GetAsync(visitor, "http://shop.example.com/");
        await GetAsync(visitor, "http://shop.example.com/cart");
        await GetAsync(visitor, "http://down.example.com/");
        using var admin = await AdminSession.SignedInAsync(_app);

        var activity = await AdminSession.PostAsync(admin, "activity/get", new JsonObject { ["range"] = "hour" });

        var points = activity["points"]!.AsArray();
        Assert.Equal((1, 60), (activity["minutesPerPoint"]!.GetValue<int>(), points.Count));
        Assert.Equal((3L, 1L), (points.Sum(p => p!["requests"]!.GetValue<long>()), points.Sum(p => p!["errors"]!.GetValue<long>())));
        Assert.NotNull(activity["p95Milliseconds"]?.GetValue<double>());
    }

    private static async Task GetAsync(HttpClient client, string url)
    {
        using var response = await client.GetAsync(new Uri(url), TestContext.Current.CancellationToken);
    }
}
