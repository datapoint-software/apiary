using Datapoint.Apiary.Cluster.Streams;

namespace Datapoint.Apiary.Proxy.Streams;

public static class StreamMatch
{
    public static bool NeedsServerName(IReadOnlyList<StreamRoute> routes) => routes.Any(r => r.ServerNames.Count > 0);

    public static StreamRoute? Choose(IReadOnlyList<StreamRoute> routes, string? serverName)
    {
        if (serverName is not null)
        {
            var exact = routes.FirstOrDefault(r => r.ServerNames.Contains(serverName, StringComparer.Ordinal));
            var wildcard = exact ?? routes.FirstOrDefault(r => r.ServerNames.Any(n => IsWildcardFor(n, serverName)));
            if (wildcard is not null)
            {
                return wildcard;
            }
        }

        return routes.FirstOrDefault(r => r.ServerNames.Count == 0);
    }

    public static bool SameTarget(StreamRoute a, StreamRoute b) =>
        a.Protocol == b.Protocol && a.ListenPort == b.ListenPort && a.TargetHost == b.TargetHost && a.TargetPort == b.TargetPort;

    private static bool IsWildcardFor(string pattern, string serverName) =>
        pattern.StartsWith("*.", StringComparison.Ordinal)
        && serverName.EndsWith(pattern[1..], StringComparison.Ordinal)
        && !serverName[..^(pattern.Length - 1)].Contains('.', StringComparison.Ordinal)
        && serverName.Length > pattern.Length - 1;
}
