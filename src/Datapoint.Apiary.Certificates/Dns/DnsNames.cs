using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Certificates.Dns;

public static class DnsNames
{
    public const string ChallengeLabel = "_acme-challenge";
    public const string TestLabel = "_apiary-test";

    public static string Normalize(string name) => name.Trim().TrimEnd('.').ToLowerInvariant();

    public static string Bare(string name) => name.StartsWith("*.", StringComparison.Ordinal) ? name[2..] : name;

    public static string Challenge(string host) => ChallengeLabel + "." + Bare(host);

    public static string Delegated(string host, string challengeZone) => Bare(host) + "." + challengeZone;

    public static string ChallengeValue(string keyAuthorization) =>
        Base64Url.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(keyAuthorization)));

    public static bool IsUnder(string name, string domain) =>
        Bare(name).Equals(domain, StringComparison.OrdinalIgnoreCase)
        || Bare(name).EndsWith("." + domain, StringComparison.OrdinalIgnoreCase);
}
