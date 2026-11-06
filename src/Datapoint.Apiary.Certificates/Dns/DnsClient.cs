using System.Buffers.Binary;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;

namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsClient(TimeProvider time)
{
    private const int MaximumUdpResponse = 4096;
    private static readonly TimeSpan s_timeout = TimeSpan.FromSeconds(3);

    public static ushort NewId() => (ushort)RandomNumberGenerator.GetInt32(ushort.MaxValue + 1);

    public async Task<DnsResponse> QueryAsync(IPEndPoint server, string name, DnsRecordType type, bool recursionDesired, CancellationToken cancellationToken)
    {
        var query = DnsMessages.Query(NewId(), name, type, recursionDesired);
        var response = await ExchangeUdpAsync(server, query, cancellationToken);
        return response.Truncated ? await ExchangeTcpAsync(server, query, cancellationToken) : response;
    }

    public async Task<DnsResponse> ExchangeTcpAsync(IPEndPoint server, byte[] message, CancellationToken cancellationToken)
    {
        using var timeout = new CancellationTokenSource(s_timeout, time);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);
        try
        {
            using var socket = new Socket(server.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            await socket.ConnectAsync(server, linked.Token);
            await using var stream = new NetworkStream(socket, ownsSocket: false);
            var length = new byte[2];
            BinaryPrimitives.WriteUInt16BigEndian(length, (ushort)message.Length);
            await stream.WriteAsync(length, linked.Token);
            await stream.WriteAsync(message, linked.Token);
            await stream.ReadExactlyAsync(length, linked.Token);
            var response = new byte[BinaryPrimitives.ReadUInt16BigEndian(length)];
            await stream.ReadExactlyAsync(response, linked.Token);
            return Matching(DnsResponse.Parse(response), message, server);
        }
        catch (Exception exception) when (IsUnreachable(exception, cancellationToken))
        {
            throw Unreachable(server, exception);
        }
    }

    private async Task<DnsResponse> ExchangeUdpAsync(IPEndPoint server, byte[] query, CancellationToken cancellationToken)
    {
        using var timeout = new CancellationTokenSource(s_timeout, time);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);
        try
        {
            using var socket = new Socket(server.AddressFamily, SocketType.Dgram, ProtocolType.Udp);
            await socket.ConnectAsync(server, linked.Token);
            await socket.SendAsync(query, SocketFlags.None, linked.Token);
            var buffer = new byte[MaximumUdpResponse];
            while (true)
            {
                var received = await socket.ReceiveAsync(buffer, SocketFlags.None, linked.Token);
                if (TryParse(buffer[..received], query) is { } response)
                {
                    return response;
                }
            }
        }
        catch (Exception exception) when (IsUnreachable(exception, cancellationToken))
        {
            throw Unreachable(server, exception);
        }
    }

    private static DnsResponse? TryParse(byte[] message, byte[] query)
    {
        try
        {
            var response = DnsResponse.Parse(message);
            return response.Id == BinaryPrimitives.ReadUInt16BigEndian(query) ? response : null;
        }
        catch (DnsException)
        {
            return null;
        }
    }

    private static DnsResponse Matching(DnsResponse response, byte[] message, IPEndPoint server) =>
        response.Id == BinaryPrimitives.ReadUInt16BigEndian(message)
            ? response
            : throw new DnsException(DnsErrors.Unreachable, $"{server} answered a different question.");

    private static bool IsUnreachable(Exception exception, CancellationToken cancellationToken) =>
        exception is SocketException or IOException || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested);

    private static DnsException Unreachable(IPEndPoint server, Exception exception) =>
        new(DnsErrors.Unreachable, $"The DNS server {server} didn't answer.", exception);
}
