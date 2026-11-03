using System.Security.Cryptography;

namespace Datapoint.Apiary.Security.Tokens;

public sealed class SealingKey
{
    public const int KeySize = 32;

    public SealingKey(byte[] value)
    {
        ArgumentOutOfRangeException.ThrowIfNotEqual(value.Length, KeySize, nameof(value));
        Value = value;
    }

    public byte[] Value { get; }

    public static SealingKey Generate() => new(RandomNumberGenerator.GetBytes(KeySize));
}
