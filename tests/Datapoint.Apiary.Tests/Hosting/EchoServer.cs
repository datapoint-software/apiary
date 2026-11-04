using System.Net;
using System.Net.Sockets;

namespace Datapoint.Apiary.Tests.Hosting;

internal sealed class EchoServer : IAsyncDisposable
{
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _stopping = new();
    private readonly Task _accepting;

    private EchoServer(TcpListener listener)
    {
        _listener = listener;
        _accepting = AcceptAsync();
    }

    public IPAddress Address => ((IPEndPoint)_listener.LocalEndpoint).Address;

    public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;

    public static EchoServer Start()
    {
        var address = Backend.RoutableAddress() ?? throw new InvalidOperationException("No routable IPv4 address to run an echo server on.");
        var listener = new TcpListener(address, 0);
        listener.Start();
        return new EchoServer(listener);
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "VSTHRD003", Justification = "The constructor starts _accepting on this instance.")]
    public async ValueTask DisposeAsync()
    {
        await _stopping.CancelAsync();
        _listener.Stop();
        await _accepting.ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
        _stopping.Dispose();
    }

    private async Task AcceptAsync()
    {
        while (!_stopping.IsCancellationRequested)
        {
            var client = await _listener.AcceptTcpClientAsync(_stopping.Token);
            _ = EchoAsync(client);
        }
    }

    private async Task EchoAsync(TcpClient client)
    {
        using (client)
        {
            var stream = client.GetStream();
            var buffer = new byte[1024];
            int read;
            while ((read = await stream.ReadAsync(buffer, _stopping.Token)) > 0)
            {
                await stream.WriteAsync(buffer.AsMemory(0, read), _stopping.Token);
            }
        }
    }
}
