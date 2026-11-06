using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public static class AwsSignature
{
    public const string Algorithm = "AWS4-HMAC-SHA256";
    private const string SignedHeaders = "host;x-amz-date";

    public static void Sign(HttpRequestMessage request, byte[] payload, string accessKey, string secretKey, string region, string service, DateTimeOffset at)
    {
        var uri = request.RequestUri!;
        var stamp = at.UtcDateTime.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var date = stamp[..8];
        var scope = $"{date}/{region}/{service}/aws4_request";
        var canonical = string.Join('\n',
            request.Method.Method,
            uri.AbsolutePath,
            CanonicalQuery(uri.Query),
            $"host:{uri.Host}",
            $"x-amz-date:{stamp}",
            "",
            SignedHeaders,
            Hex(SHA256.HashData(payload)));
        var toSign = string.Join('\n', Algorithm, stamp, scope, Hex(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))));
        var key = Hmac(Hmac(Hmac(Hmac(Encoding.UTF8.GetBytes("AWS4" + secretKey), date), region), service), "aws4_request");
        var signature = Hex(Hmac(key, toSign));
        request.Headers.TryAddWithoutValidation("x-amz-date", stamp);
        request.Headers.Authorization = new AuthenticationHeaderValue(Algorithm, $"Credential={accessKey}/{scope}, SignedHeaders={SignedHeaders}, Signature={signature}");
    }

    public static string CanonicalQuery(string query)
    {
        var pairs = query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Split('=', 2))
            .Select(p => (Key: Encode(Uri.UnescapeDataString(p[0])), Value: Encode(Uri.UnescapeDataString(p.Length > 1 ? p[1] : ""))))
            .OrderBy(p => p.Key, StringComparer.Ordinal)
            .ThenBy(p => p.Value, StringComparer.Ordinal);
        return string.Join('&', pairs.Select(p => $"{p.Key}={p.Value}"));
    }

    private static string Encode(string value) => Uri.EscapeDataString(value);

    private static byte[] Hmac(byte[] key, string data) => HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(data));

    private static string Hex(byte[] bytes) => Convert.ToHexStringLower(bytes);
}
