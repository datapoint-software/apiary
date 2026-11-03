namespace Datapoint.Apiary.Cluster.Certificates;

public static class HostPatterns
{
    public static bool Covers(string pattern, string host)
    {
        if (!pattern.StartsWith("*.", StringComparison.Ordinal))
        {
            return string.Equals(pattern, host, StringComparison.OrdinalIgnoreCase);
        }

        var dot = host.IndexOf('.', StringComparison.Ordinal);
        return dot > 0 && string.Equals(pattern[1..], host[dot..], StringComparison.OrdinalIgnoreCase);
    }

    public static bool Covers(this CertificateMaterial material, string host) => material.Hosts.Any(p => Covers(p, host));
}
