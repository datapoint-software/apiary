using System.Net;
using System.Net.Sockets;

namespace Datapoint.Apiary.Proxy.AccessLogs;

public static class ClientAddress
{
    public const int IPv4Prefix = 24;
    public const int IPv6Prefix = 48;

    public static string? Format(IPAddress? address, bool shorten)
    {
        if (address is null)
        {
            return null;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        return shorten ? Shorten(address).ToString() : address.ToString();
    }

    private static IPAddress Shorten(IPAddress address)
    {
        Span<byte> bytes = stackalloc byte[16];
        address.TryWriteBytes(bytes, out var length);
        var keep = (address.AddressFamily == AddressFamily.InterNetwork ? IPv4Prefix : IPv6Prefix) / 8;
        bytes[keep..length].Clear();
        return new IPAddress(bytes[..length]);
    }
}
