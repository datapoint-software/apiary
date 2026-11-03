using System.Net.Sockets;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed class TcpStreamConnection(NetworkStream client, NetworkStream target, CancellationToken stopping) : IDisposable
{
    private readonly CancellationTokenSource _closing = CancellationTokenSource.CreateLinkedTokenSource(stopping);

    public async Task RunAsync(ReadOnlyMemory<byte> prefix)
    {
        try
        {
            if (!prefix.IsEmpty)
            {
                await target.WriteAsync(prefix, _closing.Token);
            }

            var upstream = PumpAsync(client, target);
            var downstream = PumpAsync(target, client);
            if (await Task.WhenAny(upstream, downstream) == upstream)
            {
                Shutdown(target.Socket);
                await downstream;
            }

            Shutdown(client.Socket);
            await _closing.CancelAsync();
            await upstream;
        }
        catch (Exception exception) when (exception is OperationCanceledException or IOException)
        {
            await _closing.CancelAsync();
        }
    }

    public void Close()
    {
        try
        {
            _closing.Cancel();
        }
        catch (ObjectDisposedException)
        {
        }
    }

    public void Dispose()
    {
        _closing.Dispose();
        target.Dispose();
    }

    private static void Shutdown(Socket socket)
    {
        try
        {
            socket.Shutdown(SocketShutdown.Send);
        }
        catch (Exception exception) when (exception is SocketException or ObjectDisposedException)
        {
        }
    }

    private async Task PumpAsync(NetworkStream from, NetworkStream to)
    {
        try
        {
            await from.CopyToAsync(to, _closing.Token);
        }
        catch (Exception exception) when (exception is OperationCanceledException or IOException or ObjectDisposedException)
        {
        }
    }
}
