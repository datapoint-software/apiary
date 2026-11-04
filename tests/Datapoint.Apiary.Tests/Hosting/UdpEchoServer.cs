using System.Net;
using System.Net.Sockets;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class UdpEchoServer : IAsyncDisposable
{
    private readonly Socket _socket;
    private readonly CancellationTokenSource _stopping = new();
    private readonly Task _echoing;
    private int _received;

    private UdpEchoServer(Socket socket)
    {
        _socket = socket;
        _echoing = EchoAsync();
    }

    public IPAddress Address => ((IPEndPoint)_socket.LocalEndPoint!).Address;

    public int Port => ((IPEndPoint)_socket.LocalEndPoint!).Port;

    public int Received => Volatile.Read(ref _received);

    public static UdpEchoServer Start(int port = 0)
    {
        var address = Backend.RoutableAddress() ?? throw new InvalidOperationException("No routable IPv4 address to run an echo server on.");
        var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
        try
        {
            socket.Bind(new IPEndPoint(address, port));
        }
        catch
        {
            socket.Dispose();
            throw;
        }

        return new UdpEchoServer(socket);
    }

    public static int FreePort()
    {
        using var socket = new Socket(AddressFamily.InterNetworkV6, SocketType.Dgram, ProtocolType.Udp) { DualMode = true };
        socket.Bind(new IPEndPoint(IPAddress.IPv6Any, 0));
        return ((IPEndPoint)socket.LocalEndPoint!).Port;
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "The constructor starts _echoing on this instance.")]
    public async ValueTask DisposeAsync()
    {
        await _stopping.CancelAsync();
        _socket.Dispose();
        await _echoing.ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
        _stopping.Dispose();
    }

    private async Task EchoAsync()
    {
        var buffer = new byte[65_527];
        EndPoint any = new IPEndPoint(IPAddress.Any, 0);
        while (!_stopping.IsCancellationRequested)
        {
            var received = await _socket.ReceiveFromAsync(buffer, SocketFlags.None, any, _stopping.Token);
            Interlocked.Increment(ref _received);
            await _socket.SendToAsync(buffer.AsMemory(0, received.ReceivedBytes), SocketFlags.None, received.RemoteEndPoint, _stopping.Token);
        }
    }
}
