using System.Globalization;

namespace Datapoint.Apiary.Hosting;

public static class LoopbackHttp
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA5359", Justification = "Only for 127.0.0.1, inside the container: the admin certificate may be self-signed and covers the cluster's names, and anyone who can intercept loopback already runs in the container.")]
    public static HttpClient Create(int port, TimeSpan timeout) =>
        new(new SocketsHttpHandler { SslOptions = { RemoteCertificateValidationCallback = (_, _, _, _) => true } })
        {
            BaseAddress = new Uri(string.Create(CultureInfo.InvariantCulture, $"https://127.0.0.1:{port}/")),
            Timeout = timeout,
        };
}
