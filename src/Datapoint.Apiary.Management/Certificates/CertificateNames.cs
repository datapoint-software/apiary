using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Management.Validation;

namespace Datapoint.Apiary.Management.Certificates;

public static class CertificateNames
{
    public const int MaximumNames = 10;

    public static bool IsHostname(string name)
    {
        var hostname = DnsNames.Normalize(name);
        return hostname.Length is > 0 and <= HostnameRules.MaximumLength
            && HostnameRules.HasNoScheme(hostname)
            && HostnameRules.HasNoPath(hostname)
            && HostnameRules.IsNotAddress(hostname)
            && HostnameRules.IsFull(hostname)
            && HostnameRules.HasNoConsecutiveDots(hostname)
            && HostnameRules.HasOnlyAllowedCharacters(hostname)
            && HostnameRules.HasValidLabels(hostname);
    }

    public static bool IsName(string name) => IsHostname(DnsNames.Bare(name.Trim()));

    public static bool IsWildcard(string name) => name.StartsWith("*.", StringComparison.Ordinal);

    public static IReadOnlyList<string> Normalize(IEnumerable<string> names) =>
        [.. names.Select(DnsNames.Normalize).Where(n => n.Length > 0).Distinct(StringComparer.Ordinal)];
}
