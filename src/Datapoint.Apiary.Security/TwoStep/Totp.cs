using System.Buffers.Binary;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Datapoint.Apiary.Security.TwoStep;

public static class Totp
{
    public const int Digits = 6;
    public const int PeriodSeconds = 30;

    private const int SecretSize = 20;
    private const int AllowedDrift = 1;

    public static string NewSecret() => Base32.Encode(RandomNumberGenerator.GetBytes(SecretSize));

    public static string Uri(string secret, string account, string issuer) =>
        string.Create(
            CultureInfo.InvariantCulture,
            $"otpauth://totp/{System.Uri.EscapeDataString(issuer)}:{System.Uri.EscapeDataString(account)}?secret={secret}&issuer={System.Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits={Digits}&period={PeriodSeconds}");

    public static long Step(DateTimeOffset at) => at.ToUnixTimeSeconds() / PeriodSeconds;

    public static long? Verify(string secret, string code, DateTimeOffset at, long lastUsedStep)
    {
        var normalized = Normalize(code);
        if (normalized.Length != Digits)
        {
            return null;
        }

        var key = Base32.Decode(secret);
        var current = Step(at);
        for (var step = current - AllowedDrift; step <= current + AllowedDrift; step++)
        {
            if (step > lastUsedStep && CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(Compute(key, step)),
                Encoding.ASCII.GetBytes(normalized)))
            {
                return step;
            }
        }

        return null;
    }

    [SuppressMessage("Security", "CA5350", Justification = "RFC 6238 defaults to HMAC-SHA1, the only algorithm every authenticator app supports. HMAC-SHA1 has no known practical weakness.")]
    public static string Compute(byte[] key, long step)
    {
        Span<byte> counter = stackalloc byte[8];
        BinaryPrimitives.WriteInt64BigEndian(counter, step);
        Span<byte> hash = stackalloc byte[HMACSHA1.HashSizeInBytes];
        HMACSHA1.HashData(key, counter, hash);
        var offset = hash[^1] & 0x0F;
        var value = (BinaryPrimitives.ReadInt32BigEndian(hash[offset..]) & 0x7FFFFFFF) % 1_000_000;
        return value.ToString("D6", CultureInfo.InvariantCulture);
    }

    public static string Normalize(string code) => string.Concat(code.Where(char.IsAsciiDigit));
}
