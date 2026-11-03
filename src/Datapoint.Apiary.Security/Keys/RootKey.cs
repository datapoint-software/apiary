using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Security.Keys;

public sealed class RootKey
{
    private const string Prefix = "apiary-root-key-1:";
    private const int KeySize = 32;
    private readonly byte[] _value;

    private RootKey(byte[] value) => _value = value;

    public static RootKey Generate() => new(RandomNumberGenerator.GetBytes(KeySize));

    public static RootKey? TryParse(string text)
    {
        var trimmed = text.Trim();
        if (!trimmed.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return null;
        }

        return Base64Url.TryDecode(trimmed[Prefix.Length..]) is { Length: KeySize } value ? new RootKey(value) : null;
    }

    public string Format() => Prefix + Base64Url.Encode(_value);

    public byte[] Derive(string purpose, int length = KeySize) =>
        HKDF.DeriveKey(HashAlgorithmName.SHA256, _value, length, salt: [], info: Encoding.UTF8.GetBytes(purpose));
}
