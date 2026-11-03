using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using Datapoint.Apiary.Cluster.Streams;
using Datapoint.Apiary.Proxy.Network;
using Datapoint.Apiary.Proxy.Routing;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed partial class TcpStreamListener : IStreamListener
{
    public const int MaximumConnections = 10_000;
    public const int MaximumConnectionsPerAddress = 256;
    private const int BufferSize = 16 * 1024;
    private static readonly TimeSpan s_helloTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan s_connectTimeout = TimeSpan.FromSeconds(10);

    private readonly Socket _socket;
    private readonly TargetConnector _connector;
    private readonly AddressAllowlists _allowlists;
    private readonly StreamConnections _connections;
    private readonly ILogger _logger;
    private readonly CancellationTokenSource _stopping = new();
    private readonly ConcurrentDictionary<TcpStreamConnection, (StreamRoute Route, IPAddress? Client)> _open = new();
    private readonly AddressCounts _perAddress = new(MaximumConnectionsPerAddress);
    private readonly Task _accepting;
    private IReadOnlyList<StreamRoute> _routes;
    private int _active;

    public TcpStreamListener(int port, IReadOnlyList<StreamRoute> routes, TargetConnector connector, AddressAllowlists allowlists, StreamConnections connections, ILogger logger)
    {
        _routes = routes;
        _connector = connector;
        _allowlists = allowlists;
        _connections = connections;
        _logger = logger;
        _socket = new Socket(AddressFamily.InterNetworkV6, SocketType.Stream, ProtocolType.Tcp) { DualMode = true };
        try
        {
            _socket.Bind(new IPEndPoint(IPAddress.IPv6Any, port));
            _socket.Listen(512);
        }
        catch
        {
            _socket.Dispose();
            throw;
        }

        _accepting = AcceptAsync();
    }

    public void Update(IReadOnlyList<StreamRoute> routes)
    {
        _routes = routes;
        foreach (var (connection, (route, client)) in _open)
        {
            var current = routes.FirstOrDefault(r => r.Id == route.Id);
            if (current is null || !StreamMatch.SameTarget(current, route) || !_allowlists.Allows(current.AllowedAddresses, client))
            {
                connection.Close();
            }
        }
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "The constructor starts _accepting on this instance.")]
    public async ValueTask DisposeAsync()
    {
        await _stopping.CancelAsync();
        _socket.Dispose();
        foreach (var connection in _open.Keys)
        {
            connection.Close();
        }

        await _accepting.ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
        _stopping.Dispose();
    }

    private async Task AcceptAsync()
    {
        while (!_stopping.IsCancellationRequested)
        {
            Socket client;
            try
            {
                client = await _socket.AcceptAsync(_stopping.Token);
            }
            catch (Exception exception) when (exception is OperationCanceledException or ObjectDisposedException or SocketException)
            {
                return;
            }

            var address = Unmapped((client.RemoteEndPoint as IPEndPoint)?.Address);
            if (Interlocked.Increment(ref _active) > MaximumConnections || !_perAddress.TryAdd(address))
            {
                Interlocked.Decrement(ref _active);
                client.Dispose();
                continue;
            }

            _ = HandleCountedAsync(client, address);
        }
    }

    private static IPAddress? Unmapped(IPAddress? address) => address is { IsIPv4MappedToIPv6: true } ? address.MapToIPv4() : address;

    private async Task HandleCountedAsync(Socket client, IPAddress? address)
    {
        try
        {
            await HandleAsync(client, address);
        }
        finally
        {
            _perAddress.Remove(address);
            Interlocked.Decrement(ref _active);
        }
    }

    private async Task HandleAsync(Socket client, IPAddress? address)
    {
        client.NoDelay = true;
        using var stream = new NetworkStream(client, ownsSocket: true);
        var (route, prefix) = await ChooseAsync(stream);
        if (route is null || !_allowlists.Allows(route.AllowedAddresses, address))
        {
            return;
        }

        var target = await ConnectAsync(route);
        if (target is null)
        {
            return;
        }

        using var connection = new TcpStreamConnection(stream, new NetworkStream(target, ownsSocket: true), BufferSize, _stopping.Token);
        _open[connection] = (route, address);
        _connections.Opened(route.Id);
        try
        {
            await connection.RunAsync(prefix);
        }
        finally
        {
            _open.TryRemove(connection, out _);
            _connections.Closed(route.Id);
        }
    }

    private async Task<(StreamRoute? Route, ReadOnlyMemory<byte> Prefix)> ChooseAsync(NetworkStream stream)
    {
        var routes = _routes;
        if (!StreamMatch.NeedsServerName(routes))
        {
            return (StreamMatch.Choose(routes, null), ReadOnlyMemory<byte>.Empty);
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(_stopping.Token);
        timeout.CancelAfter(s_helloTimeout);
        try
        {
            var (prefix, serverName) = await ReadHelloAsync(stream, timeout.Token);
            return (StreamMatch.Choose(routes, serverName), prefix);
        }
        catch (Exception exception) when (exception is OperationCanceledException or IOException)
        {
            return (null, ReadOnlyMemory<byte>.Empty);
        }
    }

    private static async Task<(ReadOnlyMemory<byte> Prefix, string? ServerName)> ReadHelloAsync(NetworkStream stream, CancellationToken cancellationToken)
    {
        var buffer = new byte[ClientHello.HeaderSize + ClientHello.MaximumRecord];
        await stream.ReadExactlyAsync(buffer.AsMemory(0, ClientHello.HeaderSize), cancellationToken);
        if (ClientHello.RecordLength(buffer) is not { } length)
        {
            return (buffer.AsMemory(0, ClientHello.HeaderSize), null);
        }

        await stream.ReadExactlyAsync(buffer.AsMemory(ClientHello.HeaderSize, length), cancellationToken);
        var total = ClientHello.HeaderSize + length;
        return (buffer.AsMemory(0, total), ClientHello.ServerName(buffer.AsSpan(ClientHello.HeaderSize, length)));
    }

    private async Task<Socket?> ConnectAsync(StreamRoute route)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(_stopping.Token);
        timeout.CancelAfter(s_connectTimeout);
        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            var addresses = await _connector.ResolveAllowedAsync(route.TargetHost, route.TargetPort, timeout.Token);
            if (addresses.Length == 0)
            {
                socket.Dispose();
                return null;
            }

            await socket.ConnectAsync(addresses, route.TargetPort, timeout.Token);
            return socket;
        }
        catch (Exception exception) when (exception is OperationCanceledException or SocketException)
        {
            LogConnectFailed(_logger, route.Name, route.TargetHost, route.TargetPort, exception.Message);
            socket.Dispose();
            return null;
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Stream route {Name} couldn't reach {Host}:{Port}: {Reason}")]
    private static partial void LogConnectFailed(ILogger logger, string name, string host, int port, string reason);
}
