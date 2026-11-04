using System.Net;
using System.Net.Sockets;

namespace Datapoint.Apiary.Tests.Hosting;

internal static class LoopbackAliases
{
    public const string Missing = "These tests need the loopback addresses 127.0.0.2 to 127.0.0.4. Linux has them; on macOS, run `for n in 2 3 4; do sudo ifconfig lo0 alias 127.0.0.$n up; done` once after each restart.";

    public static IPAddress Address(int replica) => new([127, 0, 0, (byte)replica]);

    public static bool Available(int replicas) => Enumerable.Range(2, replicas - 1).All(n => CanBind(Address(n)));

    private static bool CanBind(IPAddress address)
    {
        using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        try
        {
            socket.Bind(new IPEndPoint(address, 0));
            return true;
        }
        catch (SocketException)
        {
            return false;
        }
    }
}
