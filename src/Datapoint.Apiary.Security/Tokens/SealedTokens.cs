using System.Security.Cryptography;
using System.Text;

namespace Datapoint.Apiary.Security.Tokens;

public sealed class SealedTokens(SealingKey key)
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    public string Seal(string purpose, ReadOnlySpan<byte> payload)
    {
        var sealedData = new byte[NonceSize + TagSize + payload.Length];
        var nonce = sealedData.AsSpan(0, NonceSize);
        RandomNumberGenerator.Fill(nonce);
        using var aes = new AesGcm(key.Value, TagSize);
        aes.Encrypt(nonce, payload, sealedData.AsSpan(NonceSize + TagSize), sealedData.AsSpan(NonceSize, TagSize), Encoding.UTF8.GetBytes(purpose));
        return Base64Url.Encode(sealedData);
    }

    public byte[]? Open(string purpose, string token)
    {
        if (Base64Url.TryDecode(token) is not { Length: > NonceSize + TagSize } sealedData)
        {
            return null;
        }

        var payload = new byte[sealedData.Length - NonceSize - TagSize];
        using var aes = new AesGcm(key.Value, TagSize);
        try
        {
            aes.Decrypt(sealedData.AsSpan(0, NonceSize), sealedData.AsSpan(NonceSize + TagSize), sealedData.AsSpan(NonceSize, TagSize), payload, Encoding.UTF8.GetBytes(purpose));
            return payload;
        }
        catch (AuthenticationTagMismatchException)
        {
            return null;
        }
    }
}
