using System.Security.Cryptography;

namespace Datapoint.Apiary.Security.Tokens;

public sealed class SealingKey
{
    private const int KeySize = 32;

    public byte[] Value { get; } = RandomNumberGenerator.GetBytes(KeySize);
}
