using System.Globalization;
using System.Security.Cryptography;

namespace Datapoint.Apiary.Security.Passwords;

public static class PasswordHasher
{
    private const string Algorithm = "pbkdf2-sha512";
    private const int Iterations = 210_000;
    private const int SaltSize = 16;
    private const int HashSize = 64;

    private static readonly string s_decoy = Hash("decoy password for unknown accounts");

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Derive(password, salt, Iterations, HashSize);
        return string.Join('$', Algorithm, Iterations.ToString(CultureInfo.InvariantCulture), Convert.ToBase64String(salt), Convert.ToBase64String(hash));
    }

    public static bool Verify(string password, string? stored)
    {
        var parts = (stored ?? s_decoy).Split('$');
        if (parts is not [Algorithm, var iterations, var salt, var hash])
        {
            return false;
        }

        var expected = Convert.FromBase64String(hash);
        var actual = Derive(password, Convert.FromBase64String(salt), int.Parse(iterations, CultureInfo.InvariantCulture), expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected) && stored is not null;
    }

    public static bool NeedsRehash(string stored) =>
        !stored.StartsWith(string.Create(CultureInfo.InvariantCulture, $"{Algorithm}${Iterations}$"), StringComparison.Ordinal);

    private static byte[] Derive(string password, byte[] salt, int iterations, int size) =>
        Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, size);
}
