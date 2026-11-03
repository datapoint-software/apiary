using System.Security.Cryptography;
using System.Text;

namespace Datapoint.Apiary.Security.Tokens;

public static class SecretTokens
{
    private const int TokenSize = 32;

    public static string New() => Base64Url.Encode(RandomNumberGenerator.GetBytes(TokenSize));

    public static string Hash(string token) => Base64Url.Encode(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
