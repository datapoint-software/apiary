using System.Security.Cryptography;

namespace Datapoint.Apiary.Security.Tokens;

public static class RecoveryCodes
{
    public const int Count = 10;

    private const string Alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    private const int HalfLength = 4;

    public static IReadOnlyList<string> New() =>
        [.. Enumerable.Range(0, Count).Select(_ => string.Concat(Part(), "-", Part()))];

    public static string Normalize(string code) =>
        string.Concat(code.Where(char.IsAsciiLetterOrDigit)).ToLowerInvariant();

    public static string Hash(string code) => SecretTokens.Hash(Normalize(code));

    private static string Part() => RandomNumberGenerator.GetString(Alphabet, HalfLength);
}
