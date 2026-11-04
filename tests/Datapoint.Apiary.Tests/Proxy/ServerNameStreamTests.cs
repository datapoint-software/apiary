using System.Net.Sockets;
using System.Text;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class ServerNameStreamTests : IAsyncLifetime
{
    private static readonly TimeSpan s_timeout = TimeSpan.FromSeconds(10);
    private readonly int _port = ApiaryApp.FreePort();
    private ApiaryApp _app = null!;
    private EchoServer _shop = null!;
    private EchoServer _subdomains = null!;
    private EchoServer _fallback = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _shop = EchoServer.Start();
        _subdomains = EchoServer.Start();
        _fallback = EchoServer.Start();
    }

    public async ValueTask DisposeAsync()
    {
        await _shop.DisposeAsync();
        await _subdomains.DisposeAsync();
        await _fallback.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task A_tls_stream_reaches_the_route_for_its_server_name_with_its_hello_intact()
    {
        await SeedAllAsync();
        var hello = await TlsClientHello.CaptureAsync("shop.example.com");

        var echoed = await SendAsync(hello);

        Assert.Equal(hello, echoed);
        Assert.Equal((1, 0, 0), (_shop.Accepted, _subdomains.Accepted, _fallback.Accepted));
    }

    [Fact]
    public async Task A_wildcard_route_takes_the_subdomains_it_covers()
    {
        await SeedAllAsync();
        var hello = await TlsClientHello.CaptureAsync("api.example.com");

        await SendAsync(hello);

        Assert.Equal((0, 1, 0), (_shop.Accepted, _subdomains.Accepted, _fallback.Accepted));
    }

    [Fact]
    public async Task An_unknown_server_name_goes_to_the_route_without_names()
    {
        await SeedAllAsync();
        var hello = await TlsClientHello.CaptureAsync("other.example.org");

        await SendAsync(hello);

        Assert.Equal((0, 0, 1), (_shop.Accepted, _subdomains.Accepted, _fallback.Accepted));
    }

    [Fact]
    public async Task A_stream_that_isn_t_tls_goes_to_the_route_without_names_unchanged()
    {
        await SeedAllAsync();
        var request = Encoding.ASCII.GetBytes("GET / HTTP/1.0\r\n\r\n");

        var echoed = await SendAsync(request);

        Assert.Equal(request, echoed);
        Assert.Equal((0, 0, 1), (_shop.Accepted, _subdomains.Accepted, _fallback.Accepted));
    }

    [Fact]
    public async Task An_unknown_server_name_without_a_route_without_names_is_closed()
    {
        await _app.SeedAsync(new StreamRouteSaved(StreamTo(_shop, "shop.example.com")));
        var hello = await TlsClientHello.CaptureAsync("other.example.org");

        var echoed = await SendAsync(hello);

        Assert.Equal((0, 0), (echoed.Length, _shop.Accepted));
    }

    [Fact]
    public async Task A_client_that_stops_inside_its_hello_reaches_no_route()
    {
        await SeedAllAsync();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(s_timeout);
        using var client = await ConnectAsync(timeout.Token);
        var stream = client.GetStream();
        await stream.WriteAsync(new byte[] { 22, 3, 1 }, timeout.Token);

        client.Client.Shutdown(SocketShutdown.Send);
        var read = await stream.ReadAsync(new byte[1], timeout.Token);

        Assert.Equal((0, 0, 0, 0), (read, _shop.Accepted, _subdomains.Accepted, _fallback.Accepted));
    }

    private async Task SeedAllAsync() =>
        await _app.SeedAsync(
            new StreamRouteSaved(StreamTo(_shop, "shop.example.com")),
            new StreamRouteSaved(StreamTo(_subdomains, "*.example.com")),
            new StreamRouteSaved(StreamTo(_fallback)));

    private StreamRoute StreamTo(EchoServer echo, params string[] serverNames) =>
        AStream(listenPort: _port) with { TargetHost = echo.Address.ToString(), TargetPort = echo.Port, ServerNames = serverNames };

    private async Task<byte[]> SendAsync(byte[] bytes)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(s_timeout);
        using var client = await ConnectAsync(timeout.Token);
        var stream = client.GetStream();
        await stream.WriteAsync(bytes, timeout.Token);
        var buffer = new byte[bytes.Length];
        var total = 0;
        try
        {
            int read;
            while (total < buffer.Length && (read = await stream.ReadAsync(buffer.AsMemory(total), timeout.Token)) > 0)
            {
                total += read;
            }
        }
        catch (IOException)
        {
        }

        return buffer[..total];
    }

    private async Task<TcpClient> ConnectAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            var client = new TcpClient();
            try
            {
                await client.ConnectAsync("127.0.0.1", _port, cancellationToken);
                return client;
            }
            catch (SocketException)
            {
                client.Dispose();
                await Task.Delay(10, cancellationToken);
            }
        }
    }
}
