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
    private readonly JoinKeySet _own = new(new JoinKeys(
        rootKey.Id, Base64Url.Encode(rootKey.Derive(KeyPurposes.Join)), Base64Url.Encode(rootKey.Derive(KeyPurposes.JoinTransport))));
    private IReadOnlyList<JoinKeySet> _accepted = [];

    public JoinKeys OwnKeys => _own.Keys;

    public void Accept(IEnumerable<JoinKeys> keys) =>
        _accepted = [.. keys.Where(k => k.RootKeyId != _own.Keys.RootKeyId).Select(k => new JoinKeySet(k))];

    public JoinRequest Sign(JoinRequest request) => request with { Mac = _own.Mac("request", Fields(request)) };

    public JoinKeySet? Verify(JoinRequest request, DateTimeOffset now) =>
        (now - request.At).Duration() > MaxClockSkew
            ? null
            : new[] { _own }.Concat(_accepted).FirstOrDefault(k => Equal(request.Mac, k.Mac("request", Fields(request))));

    public static JoinResponse Sign(JoinResponse response, string nonce, JoinKeySet keys) => response with { Mac = keys.Mac("response", Fields(response, nonce)) };

    public bool Verify(JoinResponse response, string nonce) => Equal(response.Mac, _own.Mac("response", Fields(response, nonce)));

    public static string SealKeys(SharedKeyRing ring, string nonce, JoinKeySet keys) =>
        keys.Transport.Seal("apiary/join-keys/" + nonce, JsonSerializer.SerializeToUtf8Bytes(ring, ClusterWireJsonContext.Default.SharedKeyRing));

    public SharedKeyRing? OpenKeys(string sealedKeys, string nonce) =>
        _own.Transport.Open("apiary/join-keys/" + nonce, sealedKeys) is { } json
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
        string.Join(',', (r.Supersedes ?? []).Select(id => id.ToString("N"))),
    ];

    private static bool Equal(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}
