using System.Net;
using System.Net.Sockets;
using System.Text;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Proxy.Network;
using Datapoint.Apiary.Proxy.Routing;
using Datapoint.Apiary.Proxy.Streams;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Tests.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class TcpStreamListenerTests : IAsyncLifetime
{
    private static readonly TimeSpan s_timeout = TimeSpan.FromSeconds(10);
    private readonly int _port = ApiaryApp.FreePort();
    private readonly StreamConnections _connections = new(TestClock.Fake());
    private EchoServer _echo = null!;
    private TcpStreamListener? _listener;

    public ValueTask InitializeAsync()
    {
        _echo = EchoServer.Start();
        return ValueTask.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        await (_listener?.DisposeAsync() ?? ValueTask.CompletedTask);
        await _echo.DisposeAsync();
    }

    [Fact]
    public async Task Changing_the_route_s_target_closes_its_open_connections()
    {
        var route = StreamTo(_echo);
        Listen(route);
        using var client = await OpenAsync("ping");

        _listener!.Update([route with { TargetPort = _echo.Port + 1 }]);

        Assert.True(await ClosedAsync(client));
    }

    [Fact]
    public async Task Narrowing_the_allowlist_closes_the_connections_it_no_longer_allows()
    {
        var route = StreamTo(_echo);
        Listen(route);
        using var client = await OpenAsync("ping");

        _listener!.Update([route with { AllowedAddresses = ["10.0.0.0/8"] }]);

        Assert.True(await ClosedAsync(client));
    }

    [Fact]
    public async Task Removing_the_route_closes_its_open_connections()
    {
        Listen(StreamTo(_echo));
        using var client = await OpenAsync("ping");

        _listener!.Update([]);

        Assert.True(await ClosedAsync(client));
    }

    [Fact]
    public async Task A_change_that_keeps_the_target_keeps_the_connections_open()
    {
        var route = StreamTo(_echo);
        Listen(route);
        using var client = await OpenAsync("ping");

        _listener!.Update([route with { Name = "Renamed database" }]);

        Assert.Equal(("pong", 1), (await RoundTripAsync(client, "pong"), _connections.Count(route.Id)));
    }

    [Fact]
    public async Task Closing_the_listener_closes_its_open_connections()
    {
        var route = StreamTo(_echo);
        Listen(route);
        using var client = await OpenAsync("ping");

        await _listener!.DisposeAsync();
        _listener = null;

        Assert.Equal((true, 0), (await ClosedAsync(client), _connections.Count(route.Id)));
    }

    [Fact]
    public async Task A_target_that_refuses_the_connection_closes_the_client_s()
    {
        Listen(StreamTo(_echo) with { TargetPort = ApiaryApp.FreePort() });
        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, _port, TestContext.Current.CancellationToken);

        Assert.True(await ClosedAsync(client));
    }

    [Fact]
    public async Task One_address_gets_at_most_its_share_of_connections()
    {
        var route = StreamTo(_echo);
        Listen(route);
        var open = await Task.WhenAll(Enumerable.Range(0, TcpStreamListener.MaximumConnectionsPerAddress).Select(_ => OpenAsync("ping")));
        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, _port, TestContext.Current.CancellationToken);

        var closed = await ClosedAsync(client);

        var counted = _connections.Count(route.Id);
        Array.ForEach(open, c => c.Dispose());
        Assert.Equal((true, TcpStreamListener.MaximumConnectionsPerAddress), (closed, (int)counted));
    }

    [Fact]
    public void A_port_that_is_already_taken_can_t_be_listened_on()
    {
        using var taken = new TcpListener(IPAddress.IPv6Any, _port);
        taken.Server.DualMode = true;
        taken.Start();

        Assert.Throws<SocketException>(() => Listen(StreamTo(_echo)));
    }

    private StreamRoute StreamTo(EchoServer echo) =>
        AStream(listenPort: _port) with { TargetHost = echo.Address.ToString(), TargetPort = echo.Port };

    private void Listen(StreamRoute route)
    {
        var connector = new TargetConnector(new OwnEndpoints(new HashSet<int>(), new HashSet<int>()), NullLogger<TargetConnector>.Instance);
        _listener = new TcpStreamListener(_port, [route], connector, new AddressAllowlists(), _connections, NullLogger.Instance);
    }

    private async Task<TcpClient> OpenAsync(string message)
    {
        var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, _port, TestContext.Current.CancellationToken);
        Assert.Equal(message, await RoundTripAsync(client, message));
        return client;
    }

    private static async Task<string> RoundTripAsync(TcpClient client, string message)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(s_timeout);
        var stream = client.GetStream();
        await stream.WriteAsync(Encoding.ASCII.GetBytes(message), timeout.Token);
        var buffer = new byte[message.Length];
        await stream.ReadExactlyAsync(buffer, timeout.Token);
        return Encoding.ASCII.GetString(buffer);
    }

    private static async Task<bool> ClosedAsync(TcpClient client)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(s_timeout);
        try
        {
            return await client.GetStream().ReadAsync(new byte[1], timeout.Token) == 0;
        }
        catch (IOException)
        {
            return true;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}
