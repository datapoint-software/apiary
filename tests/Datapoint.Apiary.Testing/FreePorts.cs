using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;

namespace Datapoint.Apiary.Testing;

public static class FreePorts
{
    private const int First = 20000;
    private const int LinuxEphemeralRangeStart = 32768;
    private const int Count = LinuxEphemeralRangeStart - First;
    private static int s_next = RandomNumberGenerator.GetInt32(Count);

    public static int Next()
    {
        for (var attempt = 0; attempt < Count; attempt++)
        {
            var port = First + (Interlocked.Increment(ref s_next) % Count);
            if (IsFree(port))
            {
                return port;
            }
        }

        throw new InvalidOperationException($"No port from {First} to {LinuxEphemeralRangeStart - 1} is free.");
    }

    private static bool IsFree(int port) =>
        IsFree(port, SocketType.Stream, ProtocolType.Tcp) && IsFree(port, SocketType.Dgram, ProtocolType.Udp);

    private static bool IsFree(int port, SocketType type, ProtocolType protocol)
    {
        try
        {
            using var socket = new Socket(AddressFamily.InterNetworkV6, type, protocol) { DualMode = true };
            socket.Bind(new IPEndPoint(IPAddress.IPv6Any, port));
            return true;
        }
        catch (SocketException)
        {
            return false;
        }
    }
}
