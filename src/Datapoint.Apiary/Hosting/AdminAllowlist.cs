using System.Net;
using Microsoft.AspNetCore.Connections;

namespace Datapoint.Apiary.Hosting;

public sealed partial class AdminAllowlist(IReadOnlyList<IPNetwork> networks, ILogger<AdminAllowlist> logger)
{
    public static AdminAllowlist Create(IEnumerable<string> ranges, ILogger<AdminAllowlist> logger) =>
        new([.. ranges.Select(IPNetwork.Parse)], logger);

    public bool Allows(IPAddress address)
    {
        var mapped = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
        foreach (var network in networks)
        {
            if (network.Contains(mapped))
            {
                return true;
            }
        }

        return false;
    }

    public ConnectionDelegate Guard(ConnectionDelegate next) => async connection =>
    {
        if (connection.RemoteEndPoint is IPEndPoint remote && Allows(remote.Address))
        {
            await next(connection);
            return;
        }

        LogRefused(connection.RemoteEndPoint?.ToString());
        connection.Abort();
    };

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refused an admin connection from {Remote}, which isn't in the admin allowlist")]
    private partial void LogRefused(string? remote);
}
