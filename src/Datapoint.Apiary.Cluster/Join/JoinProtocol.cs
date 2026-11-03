using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Security.Keys;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Cluster.Join;

public sealed class JoinProtocol(RootKey rootKey)
{
    public static readonly TimeSpan MaxClockSkew = TimeSpan.FromMinutes(5);
    private readonly byte[] _macKey = rootKey.Derive(KeyPurposes.Join);
    private readonly SealedTokens _transport = new(new SealingKey(rootKey.Derive(KeyPurposes.JoinTransport)));

    public JoinRequest Sign(JoinRequest request) => request with { Mac = Mac("request", Fields(request)) };

    public bool Verify(JoinRequest request, DateTimeOffset now) =>
        (now - request.At).Duration() <= MaxClockSkew && Equal(request.Mac, Mac("request", Fields(request)));

    public JoinResponse Sign(JoinResponse response, string nonce) => response with { Mac = Mac("response", Fields(response, nonce)) };

    public bool Verify(JoinResponse response, string nonce) => Equal(response.Mac, Mac("response", Fields(response, nonce)));

    public string SealKeys(SharedKeyRing keys, string nonce) =>
        _transport.Seal("apiary/join-keys/" + nonce, JsonSerializer.SerializeToUtf8Bytes(keys, ClusterWireJsonContext.Default.SharedKeyRing));

    public SharedKeyRing? OpenKeys(string sealedKeys, string nonce) =>
        _transport.Open("apiary/join-keys/" + nonce, sealedKeys) is { } json
            ? JsonSerializer.Deserialize(json, ClusterWireJsonContext.Default.SharedKeyRing)
            : null;

    private static string[] Fields(JoinRequest r) =>
    [
        r.ReplicaId.ToString("N"), r.Node, r.Address, r.ClusterId?.ToString("N") ?? "", r.PublicKey,
        r.At.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture), r.Nonce,
    ];

    private static string[] Fields(JoinResponse r, string nonce) =>
    [
        nonce, r.Status.ToString(), r.ReplicaId.ToString("N"), r.Address, r.ClusterId?.ToString("N") ?? "",
        r.AuthorityPem ?? "", r.CertificatePem ?? "", r.Keys ?? "",
    ];

    private string Mac(string kind, string[] fields)
    {
        var text = kind + "\n" + string.Join('\n', fields.Select(f => f.Length.ToString(CultureInfo.InvariantCulture) + ":" + f));
        return Base64Url.Encode(HMACSHA256.HashData(_macKey, Encoding.UTF8.GetBytes(text)));
    }

    private static bool Equal(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}
