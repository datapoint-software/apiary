using System.Net.Sockets;
using System.Text;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class StreamTests : IAsyncLifetime
{
    private static readonly TimeSpan s_timeout = TimeSpan.FromSeconds(10);
    private readonly int _port = ApiaryApp.FreePort();
    private ApiaryApp _app = null!;
    private EchoServer _echo = null!;

    public async ValueTask InitializeAsync()
    {
        _app = await ApiaryApp.StartAsync();
        _echo = EchoServer.Start();
    }

    public async ValueTask DisposeAsync()
    {
        await _echo.DisposeAsync();
        await _app.DisposeAsync();
    }

    [Fact]
    public async Task A_tcp_stream_reaches_its_target_both_ways()
    {
        await _app.SeedAsync(new StreamRouteSaved(StreamTo(_echo)));

        Assert.Equal("ping", await RoundTripAsync("ping"));
    }

    [Fact]
    public async Task An_address_outside_a_stream_s_allowlist_is_cut_off()
    {
        await _app.SeedAsync(new StreamRouteSaved(StreamTo(_echo) with { AllowedAddresses = ["10.0.0.0/8"] }));

        Assert.Equal(string.Empty, await RoundTripAsync("ping"));
    }

    [Fact]
    public async Task A_stream_to_loopback_is_refused()
    {
        var route = AStream(listenPort: _port) with { TargetHost = "127.0.0.1", TargetPort = _app.AdminPort };
        await _app.SeedAsync(new StreamRouteSaved(route));

        Assert.Equal(string.Empty, await RoundTripAsync("GET / HTTP/1.0\r\n\r\n"));
    }

    [Fact]
    public async Task Deleting_a_stream_closes_its_port()
    {
        var route = StreamTo(_echo);
        await _app.SeedAsync(new StreamRouteSaved(route));
        await RoundTripAsync("ping");

        await _app.SeedAsync(new StreamRouteDeleted(route.Id));

        Assert.True(await Testing.Eventually.TrueAsync(() => !Accepts(_port)));
    }

    private StreamRoute StreamTo(EchoServer echo) =>
        AStream(listenPort: _port) with { TargetHost = echo.Address.ToString(), TargetPort = echo.Port };

    private static bool Accepts(int port)
    {
        using var client = new TcpClient();
        try
        {
            client.Connect("127.0.0.1", port);
            return true;
        }
        catch (SocketException)
        {
            return false;
        }
    }

    private async Task<string> RoundTripAsync(string message)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(s_timeout);
        using var client = await ConnectAsync(timeout.Token);
        var stream = client.GetStream();
        await stream.WriteAsync(Encoding.ASCII.GetBytes(message), timeout.Token);
        var buffer = new byte[message.Length];
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

        return Encoding.ASCII.GetString(buffer, 0, total);
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
