using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class RequestSizeTests : IAsyncLifetime
{
    private const long OneMegabyte = 1_000_000;
    private static readonly TimeSpan s_responseTimeout = TimeSpan.FromSeconds(30);
    private ApiaryApp _app = null!;
    private Backend _web = null!;
    private HttpClient _client = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _web = await Backend.StartAsync("web");
        _client = Clients.Public(_app);
        await _app.SeedAsync(new RouteDefaultsSaved(new RouteDefaults(1)));
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _web.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task A_request_within_the_default_size_reaches_the_target()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        using var response = await PostAsync(new ByteArrayContent(new byte[OneMegabyte]));

        Assert.Equal(OneMegabyte, await ReceivedAsync(response));
    }

    [Fact]
    public async Task A_request_over_the_default_size_gets_a_413()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        using var response = await PostAsync(new ByteArrayContent(new byte[OneMegabyte + 1]));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task A_chunked_request_over_the_default_size_gets_a_413()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)));

        var statusLine = await SendOneChunkAsync(OneMegabyte + 1);

        Assert.StartsWith("HTTP/1.1 413 ", statusLine, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_route_with_its_own_size_accepts_a_larger_request()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { RequestSize = RequestSizeLimit.Custom, RequestMegabytes = 3 }));

        using var response = await PostAsync(new ByteArrayContent(new byte[2 * OneMegabyte]));

        Assert.Equal(2 * OneMegabyte, await ReceivedAsync(response));
    }

    [Fact]
    public async Task A_route_without_a_limit_accepts_any_size()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web) with { RequestSize = RequestSizeLimit.Unlimited }));

        using var response = await PostAsync(new ByteArrayContent(new byte[40 * OneMegabyte]));

        Assert.Equal(40 * OneMegabyte, await ReceivedAsync(response));
    }

    [Fact]
    public async Task A_new_default_applies_without_a_restart()
    {
        await _app.SeedAsync(new RouteSaved(RouteTo(_web)), new RouteDefaultsSaved(new RouteDefaults(3)));

        using var response = await PostAsync(new ByteArrayContent(new byte[2 * OneMegabyte]));

        Assert.Equal(2 * OneMegabyte, await ReceivedAsync(response));
    }

    private static Route RouteTo(Backend backend) =>
        ARoute(host: "shop.example.com") with { Targets = [new RouteTarget(backend.Address.ToString(), backend.Port, 100)] };

    private static async Task<long> ReceivedAsync(HttpResponseMessage response) =>
        JsonNode.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken))?["received"]?.GetValue<long>() ?? 0;

    private async Task<string?> SendOneChunkAsync(long bytes)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(s_responseTimeout);
        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, _app.HttpPort, timeout.Token);
        var stream = client.GetStream();
        var head = $"POST /upload HTTP/1.1\r\nHost: shop.example.com\r\nTransfer-Encoding: chunked\r\n\r\n{bytes:x}\r\n";
        await stream.WriteAsync(Encoding.ASCII.GetBytes(head), timeout.Token);
        await stream.WriteAsync(new byte[bytes], timeout.Token);
        using var reader = new StreamReader(stream, Encoding.ASCII);
        return await reader.ReadLineAsync(timeout.Token);
    }

    private async Task<HttpResponseMessage> PostAsync(HttpContent content)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "http://shop.example.com/upload") { Content = content };
        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }
}
