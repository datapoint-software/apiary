using System.Net;
using System.Net.Sockets;

namespace Datapoint.Apiary.Tests.Hosting;

internal static class Clients
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA5359", Justification = "Tests talk to an in-process Apiary on 127.0.0.1 with its self-signed certificates.")]
    public static HttpClient Admin(ApiaryApp app, bool useCookies = true) =>
        new(new SocketsHttpHandler
        {
            UseCookies = useCookies,
            SslOptions = { RemoteCertificateValidationCallback = (_, _, _, _) => true },
        })
        {
            BaseAddress = new Uri($"https://127.0.0.1:{app.AdminPort}"),
        };

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA5359", Justification = "Tests talk to an in-process Apiary on 127.0.0.1 with its self-signed certificates.")]
    public static HttpClient Public(ApiaryApp app, bool https = false) =>
        new(new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseCookies = false,
            SslOptions = { RemoteCertificateValidationCallback = (_, _, _, _) => true },
            ConnectCallback = async (context, cancellationToken) =>
            {
                var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                await socket.ConnectAsync(IPAddress.Loopback, https ? app.HttpsPort : app.HttpPort, cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            },
        });
}
