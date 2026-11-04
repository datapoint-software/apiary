using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class CachingTests : IAsyncLifetime
{
    private const string Cacheable = "http://shop.example.com/page?cache=public,max-age=60";
    private ApiaryApp _app = null!;
    private Backend _web = null!;
    private HttpClient _client = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _web = await Backend.StartAsync("web");
        _client = Clients.Public(_app);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _web.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task A_cacheable_answer_is_served_from_the_cache()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Caching = true }));

        Assert.Equal(await AnsweredAtAsync(Cacheable), await AnsweredAtAsync(Cacheable));
    }

    [Fact]
    public async Task A_route_without_caching_always_asks_its_target()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        Assert.NotEqual(await AnsweredAtAsync(Cacheable), await AnsweredAtAsync(Cacheable));
    }

    [Fact]
    public async Task An_answer_the_target_marks_no_store_isn_t_cached()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Caching = true }));

        Assert.NotEqual(await AnsweredAtAsync("http://shop.example.com/page"), await AnsweredAtAsync("http://shop.example.com/page"));
    }

    [Fact]
    public async Task A_request_with_a_cookie_doesn_t_get_a_private_answer_cached()
    {
        const string url = "http://shop.example.com/page?cache=max-age=60";
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Caching = true }));

        Assert.NotEqual(await AnsweredAtAsync(url, ("Cookie", "cart=42")), await AnsweredAtAsync(url, ("Cookie", "cart=42")));
    }

    [Fact]
    public async Task A_visitor_with_a_cookie_doesn_t_get_an_anonymous_visitor_s_answer()
    {
        const string url = "http://shop.example.com/page?cache=max-age=60";
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Caching = true }));

        Assert.NotEqual(await AnsweredAtAsync(url), await AnsweredAtAsync(url, ("Cookie", "cart=42")));
    }

    [Fact]
    public async Task A_different_query_is_a_different_answer()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Caching = true }));

        Assert.NotEqual(await AnsweredAtAsync(Cacheable), await AnsweredAtAsync(Cacheable + "&page=2"));
    }

    [Fact]
    public async Task Purging_a_route_empties_its_cache()
    {
        var route = RouteTo(_web) with { Caching = true };
        await _app.SeedAsync(new RouteSaved(route));
        var before = await AnsweredAtAsync(Cacheable);

        await _app.SeedAsync(new RouteSaved(route with { CachePurgedAt = DateTimeOffset.UtcNow }));

        Assert.True(await AnswersOtherThanAsync(Cacheable, before));
    }

    [Fact]
    public async Task A_route_with_compression_compresses_for_a_client_that_accepts_it()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { Compression = true }));

        using var response = await GetAsync("http://shop.example.com/", ("Accept-Encoding", "gzip"));

        Assert.Equal("gzip", response.Content.Headers.ContentEncoding.Single());
    }

    [Fact]
    public async Task A_route_without_compression_doesn_t_compress()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        using var response = await GetAsync("http://shop.example.com/", ("Accept-Encoding", "gzip"));

        Assert.Empty(response.Content.Headers.ContentEncoding);
    }

    private static Route RouteTo(Backend backend) =>
        ARoute(host: "shop.example.com") with { Targets = [new RouteTarget(backend.Address.ToString(), backend.Port, 100)] };

    private async Task<HttpResponseMessage> GetAsync(string url, params (string Name, string Value)[] headers)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        foreach (var (name, value) in headers)
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private async Task<bool> AnswersOtherThanAsync(string url, long before)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (!timeout.IsCancellationRequested)
        {
            if (await AnsweredAtAsync(url) != before)
            {
                return true;
            }

            await Task.Delay(10, CancellationToken.None);
        }

        return false;
    }

    private async Task<long> AnsweredAtAsync(string url, params (string Name, string Value)[] headers)
    {
        using var response = await GetAsync(url, headers);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"{url} answered {(int)response.StatusCode}: {text}");
        return JsonNode.Parse(text)!["at"]!.GetValue<long>();
    }
}
