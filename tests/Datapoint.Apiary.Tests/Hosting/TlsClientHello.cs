using System.Buffers.Binary;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;

namespace Datapoint.Apiary.Tests.Hosting;

internal static class TlsClientHello
{
    private const int HeaderSize = 5;

    public static async Task<byte[]> CaptureAsync(string targetHost)
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, ((IPEndPoint)listener.LocalEndpoint).Port, cancellationToken);
        using var server = await listener.AcceptTcpClientAsync(cancellationToken);
        await using var tls = new SslStream(client.GetStream());
        var handshake = tls.AuthenticateAsClientAsync(new SslClientAuthenticationOptions { TargetHost = targetHost }, cancellationToken);
        var record = await ReadRecordAsync(server.GetStream(), cancellationToken);
        server.Close();
        await handshake.ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
        return record;
    }

    public static async Task<byte[]> ReadRecordAsync(Stream stream, CancellationToken cancellationToken)
    {
        var header = new byte[HeaderSize];
        await stream.ReadExactlyAsync(header, cancellationToken);
        var record = new byte[HeaderSize + BinaryPrimitives.ReadUInt16BigEndian(header.AsSpan(3))];
        header.CopyTo(record, 0);
        await stream.ReadExactlyAsync(record.AsMemory(HeaderSize), cancellationToken);
        return record;
    }
}
