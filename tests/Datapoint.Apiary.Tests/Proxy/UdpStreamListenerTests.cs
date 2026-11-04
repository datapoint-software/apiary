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
using Microsoft.Extensions.Time.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Tests.Proxy;

public sealed class UdpStreamListenerTests : IAsyncLifetime
{
    private static readonly TimeSpan s_reply = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan s_silence = TimeSpan.FromMilliseconds(500);
    private readonly int _port = UdpEchoServer.FreePort();
    private readonly FakeTimeProvider _time = TestClock.Fake();
    private readonly UdpClient _client = new(new IPEndPoint(IPAddress.IPv6Loopback, 0));
    private readonly UdpClient _otherClient = new(new IPEndPoint(IPAddress.IPv6Loopback, 0));
    private readonly StreamConnections _connections;
    private UdpEchoServer _echo = null!;
    private UdpStreamListener? _listener;

    public UdpStreamListenerTests() => _connections = new StreamConnections(_time);

    public ValueTask InitializeAsync()
    {
        _echo = UdpEchoServer.Start();
        return ValueTask.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        await (_listener?.DisposeAsync() ?? ValueTask.CompletedTask);
        await _echo.DisposeAsync();
        _client.Dispose();
        _otherClient.Dispose();
    }

    [Fact]
    public async Task A_datagram_reaches_the_target_and_its_reply_comes_back()
    {
        Listen(UdpStreamTo(_echo));

        Assert.Equal("ping", await RoundTripAsync(_client, "ping", s_reply));
    }

    [Fact]
    public async Task Each_client_gets_its_own_session_and_its_own_replies()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);

        var replies = await Task.WhenAll(RoundTripAsync(_client, "from one", s_reply), RoundTripAsync(_otherClient, "from another", s_reply));

        Assert.Equal(["from one", "from another"], replies);
        Assert.Equal(2, _connections.Count(route.Id));
    }

    [Fact]
    public async Task A_client_s_later_datagrams_reuse_its_session()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "first", s_reply);

        await RoundTripAsync(_client, "second", s_reply);

        Assert.Equal((1, 2), (_connections.Count(route.Id), _echo.Received));
    }

    [Fact]
    public async Task A_session_ends_after_the_route_s_idle_timeout()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);

        _time.Advance(TimeSpan.FromSeconds(route.IdleTimeoutSeconds + 1));

        Assert.True(await Eventually.TrueAsync(() => _connections.Count(route.Id) == 0));
    }

    [Fact]
    public async Task A_session_with_recent_traffic_outlives_an_idle_one()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await Task.WhenAll(RoundTripAsync(_client, "active", s_reply), RoundTripAsync(_otherClient, "idle", s_reply));
        var opened = _connections.LastOpened(route.Id);
        _time.Advance(TimeSpan.FromSeconds(route.IdleTimeoutSeconds * 2 / 3));
        await RoundTripAsync(_client, "still here", s_reply);

        _time.Advance(TimeSpan.FromSeconds(route.IdleTimeoutSeconds * 2 / 3));
        var idleEnded = await Eventually.TrueAsync(() => _connections.Count(route.Id) == 1);
        await RoundTripAsync(_client, "and here", s_reply);

        Assert.Equal((true, 1, opened), (idleEnded, _connections.Count(route.Id), _connections.LastOpened(route.Id)));
    }

    [Fact]
    public async Task A_client_outside_the_route_s_allowlist_gets_no_session()
    {
        var route = UdpStreamTo(_echo) with { AllowedAddresses = ["10.0.0.0/8"] };
        Listen(route);

        var reply = await RoundTripAsync(_client, "ping", s_silence);

        Assert.Equal((null, 0, 0), (reply, _echo.Received, _connections.Count(route.Id)));
    }

    [Fact]
    public async Task A_target_on_loopback_is_refused()
    {
        var route = UdpStreamTo(_echo) with { TargetHost = "127.0.0.1" };
        Listen(route);

        var reply = await RoundTripAsync(_client, "ping", s_silence);

        Assert.Equal((null, 0), (reply, _connections.Count(route.Id)));
    }

    [Fact]
    public async Task A_target_that_isn_t_listening_yet_doesn_t_end_the_session()
    {
        var port = UdpEchoServer.FreePort();
        var route = UdpStreamTo(_echo) with { TargetPort = port };
        Listen(route);
        await RoundTripAsync(_client, "nobody there", s_silence);
        await using var late = UdpEchoServer.Start(port);

        var reply = await RoundTripAsync(_client, "ping", s_reply);

        Assert.Equal(("ping", 1), (reply, _connections.Count(route.Id)));
    }

    [Fact]
    public async Task One_address_gets_at_most_its_share_of_sessions()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        var clients = Enumerable.Range(0, UdpStreamListener.MaximumSessionsPerAddress)
            .Select(_ => new UdpClient(new IPEndPoint(IPAddress.IPv6Loopback, 0)))
            .ToList();
        await Task.WhenAll(clients.Select(c => RoundTripAsync(c, "ping", s_reply)));

        var reply = await RoundTripAsync(_client, "one too many", s_silence);

        clients.ForEach(c => c.Dispose());
        Assert.Equal((null, UdpStreamListener.MaximumSessionsPerAddress), (reply, (int)_connections.Count(route.Id)));
    }

    [Fact]
    public async Task Changing_the_route_s_target_ends_its_sessions_and_new_ones_reach_the_new_target()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);
        await using var moved = UdpEchoServer.Start();

        _listener!.Update([route with { TargetPort = moved.Port }]);
        var ended = _connections.Count(route.Id);
        await RoundTripAsync(_client, "pong", s_reply);

        Assert.Equal((0, 1, 1), (ended, moved.Received, _echo.Received));
    }

    [Fact]
    public async Task Narrowing_the_allowlist_ends_the_sessions_it_no_longer_allows()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);

        _listener!.Update([route with { AllowedAddresses = ["10.0.0.0/8"] }]);

        Assert.Equal(0, _connections.Count(route.Id));
    }

    [Fact]
    public async Task Replacing_the_route_with_another_ends_the_old_one_s_sessions()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);
        var replacement = route with { Id = AnId() };

        _listener!.Update([replacement]);
        await RoundTripAsync(_client, "pong", s_reply);

        Assert.Equal((0, 1), (_connections.Count(route.Id), _connections.Count(replacement.Id)));
    }

    [Fact]
    public async Task Removing_the_route_ends_its_sessions_and_refuses_new_datagrams()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);

        _listener!.Update([]);
        var reply = await RoundTripAsync(_client, "pong", s_silence);

        Assert.Equal((null, 0, 1), (reply, _connections.Count(route.Id), _echo.Received));
    }

    [Fact]
    public async Task A_change_that_keeps_the_target_keeps_the_sessions()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);
        var opened = _connections.LastOpened(route.Id);
        _time.Advance(TimeSpan.FromSeconds(1));

        _listener!.Update([route with { Name = "Renamed database" }]);
        await RoundTripAsync(_client, "pong", s_reply);

        Assert.Equal((1, opened), (_connections.Count(route.Id), _connections.LastOpened(route.Id)));
    }

    [Fact]
    public async Task Closing_the_listener_ends_its_sessions()
    {
        var route = UdpStreamTo(_echo);
        Listen(route);
        await RoundTripAsync(_client, "ping", s_reply);

        await _listener!.DisposeAsync();
        _listener = null;

        Assert.Equal(0, _connections.Count(route.Id));
    }

    [Fact]
    public void A_port_that_is_already_taken_can_t_be_listened_on()
    {
        using var taken = new Socket(AddressFamily.InterNetworkV6, SocketType.Dgram, ProtocolType.Udp) { DualMode = true };
        taken.Bind(new IPEndPoint(IPAddress.IPv6Any, _port));

        Assert.Throws<SocketException>(() => Listen(UdpStreamTo(_echo)));
    }

    private StreamRoute UdpStreamTo(UdpEchoServer echo) =>
        AStream(listenPort: _port) with { Protocol = StreamProtocol.Udp, TargetHost = echo.Address.ToString(), TargetPort = echo.Port };

    private void Listen(StreamRoute route)
    {
        var connector = new TargetConnector(new OwnEndpoints(new HashSet<int>(), new HashSet<int>()), NullLogger<TargetConnector>.Instance);
        _listener = new UdpStreamListener(_port, route, connector, new AddressAllowlists(), _connections, _time, NullLogger.Instance);
    }

    private async Task<string?> RoundTripAsync(UdpClient client, string message, TimeSpan wait)
    {
        await client.SendAsync(Encoding.ASCII.GetBytes(message), new IPEndPoint(IPAddress.IPv6Loopback, _port), TestContext.Current.CancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(wait);
        try
        {
            var received = await client.ReceiveAsync(timeout.Token);
            return Encoding.ASCII.GetString(received.Buffer);
        }
        catch (OperationCanceledException)
        {
            return null;
        }
    }
}
