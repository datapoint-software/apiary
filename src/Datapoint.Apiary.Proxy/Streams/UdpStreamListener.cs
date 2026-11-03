using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Proxy.Network;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed partial class UdpStreamListener : IStreamListener
{
    public const int MaximumSessions = 10_000;
    private const int MaximumDatagram = 65_527;
    private static readonly TimeSpan s_sweepEvery = TimeSpan.FromSeconds(1);

    private readonly Socket _socket;
    private readonly TargetConnector _connector;
    private readonly StreamConnections _connections;
    private readonly TimeProvider _time;
    private readonly ILogger _logger;
    private readonly CancellationTokenSource _stopping = new();
    private readonly ConcurrentDictionary<EndPoint, UdpStreamSession> _sessions = new();
    private readonly Task _receiving;
    private readonly Task _sweeping;
    private StreamRoute? _route;

    public UdpStreamListener(int port, StreamRoute route, TargetConnector connector, StreamConnections connections, TimeProvider time, ILogger logger)
    {
        _route = route;
        _connector = connector;
        _connections = connections;
        _time = time;
        _logger = logger;
        _socket = new Socket(AddressFamily.InterNetworkV6, SocketType.Dgram, ProtocolType.Udp) { DualMode = true };
        try
        {
            _socket.Bind(new IPEndPoint(IPAddress.IPv6Any, port));
        }
        catch
        {
            _socket.Dispose();
            throw;
        }

        _receiving = ReceiveAsync();
        _sweeping = SweepAsync();
    }

    public void Update(IReadOnlyList<StreamRoute> routes)
    {
        _route = routes.Count > 0 ? routes[0] : null;
        foreach (var session in _sessions.Values)
        {
            if (_route is null || session.Route.Id != _route.Id || !StreamMatch.SameTarget(_route, session.Route))
            {
                End(session);
            }
        }
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "The constructor starts _receiving and _sweeping on this instance.")]
    public async ValueTask DisposeAsync()
    {
        await _stopping.CancelAsync();
        _socket.Dispose();
        foreach (var session in _sessions.Values)
        {
            End(session);
        }

        await Task.WhenAll(_receiving, _sweeping).ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
        _stopping.Dispose();
    }

    private async Task ReceiveAsync()
    {
        var buffer = new byte[MaximumDatagram];
        EndPoint any = new IPEndPoint(IPAddress.IPv6Any, 0);
        while (!_stopping.IsCancellationRequested)
        {
            SocketReceiveFromResult received;
            try
            {
                received = await _socket.ReceiveFromAsync(buffer, SocketFlags.None, any, _stopping.Token);
            }
            catch (SocketException)
            {
                continue;
            }
            catch (Exception exception) when (exception is OperationCanceledException or ObjectDisposedException)
            {
                return;
            }

            await ForwardAsync(received.RemoteEndPoint, buffer.AsMemory(0, received.ReceivedBytes));
        }
    }

    private async Task ForwardAsync(EndPoint client, ReadOnlyMemory<byte> datagram)
    {
        var session = _sessions.TryGetValue(client, out var existing) ? existing : await OpenAsync(client);
        if (session is null)
        {
            return;
        }

        session.Touch();
        try
        {
            await session.Target.SendAsync(datagram, SocketFlags.None, _stopping.Token);
        }
        catch (SocketException)
        {
        }
    }

    private async Task<UdpStreamSession?> OpenAsync(EndPoint client)
    {
        if (_route is not { } route || _sessions.Count >= MaximumSessions)
        {
            return null;
        }

        var addresses = await _connector.ResolveAllowedAsync(route.TargetHost, route.TargetPort, _stopping.Token);
        if (addresses.Length == 0)
        {
            return null;
        }

        var target = new Socket(addresses[0].AddressFamily, SocketType.Dgram, ProtocolType.Udp);
        try
        {
            await target.ConnectAsync(addresses[0], route.TargetPort, _stopping.Token);
        }
        catch (SocketException exception)
        {
            LogConnectFailed(_logger, route.Name, route.TargetHost, route.TargetPort, exception.Message);
            target.Dispose();
            return null;
        }

        var session = new UdpStreamSession(route, client, target, _time);
        _sessions[client] = session;
        _connections.Opened(route.Id);
        _ = ReplyAsync(session);
        return session;
    }

    private async Task ReplyAsync(UdpStreamSession session)
    {
        var buffer = new byte[MaximumDatagram];
        while (_sessions.ContainsKey(session.Client))
        {
            try
            {
                var count = await session.Target.ReceiveAsync(buffer, SocketFlags.None, _stopping.Token);
                session.Touch();
                await _socket.SendToAsync(buffer.AsMemory(0, count), SocketFlags.None, session.Client, _stopping.Token);
            }
            catch (SocketException exception) when (exception.SocketErrorCode is SocketError.ConnectionRefused or SocketError.ConnectionReset)
            {
            }
            catch (Exception exception) when (exception is OperationCanceledException or ObjectDisposedException or SocketException)
            {
                return;
            }
        }
    }

    private async Task SweepAsync()
    {
        using var timer = new PeriodicTimer(s_sweepEvery, _time);
        try
        {
            while (await timer.WaitForNextTickAsync(_stopping.Token))
            {
                foreach (var session in _sessions.Values.Where(s => s.IsIdle(TimeSpan.FromSeconds((_route ?? s.Route).IdleTimeoutSeconds))))
                {
                    End(session);
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private void End(UdpStreamSession session)
    {
        if (!_sessions.TryRemove(new KeyValuePair<EndPoint, UdpStreamSession>(session.Client, session)))
        {
            return;
        }

        _connections.Closed(session.Route.Id);
        session.Dispose();
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stream route {Name} couldn't reach {Host}:{Port}: {Reason}")]
    private static partial void LogConnectFailed(ILogger logger, string name, string host, int port, string reason);
}
