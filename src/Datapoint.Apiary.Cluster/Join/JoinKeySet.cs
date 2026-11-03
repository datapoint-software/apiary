using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Cluster.Join;

public sealed class JoinKeySet(JoinKeys keys)
{
    private readonly byte[] _mac = Base64Url.TryDecode(keys.Mac) ?? throw new InvalidDataException("A join key isn't base64url.");

    public JoinKeys Keys { get; } = keys;

    public SealedTokens Transport { get; } = new(new SealingKey(Base64Url.TryDecode(keys.Transport) ?? throw new InvalidDataException("A join key isn't base64url.")));

    public string Mac(string kind, string[] fields)
    {
        var text = kind + "\n" + string.Join('\n', fields.Select(f => f.Length.ToString(CultureInfo.InvariantCulture) + ":" + f));
        return Base64Url.Encode(HMACSHA256.HashData(_mac, Encoding.UTF8.GetBytes(text)));
    }
}
