using System.Net;
using System.Net.Sockets;
using Datapoint.Apiary.Security.Network;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Proxy.Network;

public sealed partial class TargetConnector(OwnEndpoints own, ILogger<TargetConnector> logger)
{
    public async ValueTask<Stream> ConnectAsync(SocketsHttpConnectionContext context, CancellationToken cancellationToken)
    {
        var endpoint = context.DnsEndPoint;
        var allowed = await ResolveAllowedAsync(endpoint.Host, endpoint.Port, cancellationToken);
        if (allowed.Length == 0)
        {
            throw new HttpRequestException(HttpRequestError.ConnectionError, "The target resolves only to refused addresses.");
        }

        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            await socket.ConnectAsync(allowed, endpoint.Port, cancellationToken);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }

    public async Task<IPAddress[]> ResolveAllowedAsync(string host, int port, CancellationToken cancellationToken)
    {
        var addresses = await ResolveAsync(host, cancellationToken);
        var allowed = addresses.Where(a => IsAllowed(a, port)).ToArray();
        if (allowed.Length == 0)
        {
            LogRefused(host, port);
        }

        return allowed;
    }

    private static async Task<IPAddress[]> ResolveAsync(string host, CancellationToken cancellationToken) =>
        IPAddress.TryParse(host.Trim('[', ']'), out var literal)
            ? [literal]
            : await Dns.GetHostAddressesAsync(host, cancellationToken);

    private bool IsAllowed(IPAddress address, int port) =>
        AddressPolicy.Classify(address) is AddressKind.Routable && !own.IsOwn(address, port);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refused a connection to {Host}:{Port}, which resolves to Apiary itself, loopback or a link-local address, or is Apiary's admin, Raft or cluster port")]
    private partial void LogRefused(string host, int port);
}
