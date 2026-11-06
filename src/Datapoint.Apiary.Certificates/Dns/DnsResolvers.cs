using System.Net;

namespace Datapoint.Apiary.Certificates.Dns;

public static class DnsResolvers
{
    public static IReadOnlyList<IPEndPoint> Parse(string list) =>
        [.. list.Split([',', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(Endpoint).OfType<IPEndPoint>()];

    public static IReadOnlyList<IPEndPoint> FromResolverFile(string text) =>
        [.. text.Split('\n')
            .Select(line => line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .Where(words => words is ["nameserver", _, ..])
            .Select(words => Endpoint(words[1]))
            .OfType<IPEndPoint>()];

    private static IPEndPoint? Endpoint(string text)
    {
        if (IPAddress.TryParse(text, out var address))
        {
            return new IPEndPoint(address, DnsOptions.DefaultPort);
        }

        return IPEndPoint.TryParse(text, out var endpoint) ? endpoint : null;
    }
}
