using System.Buffers.Binary;
using System.Security.Cryptography;

namespace Datapoint.Apiary.Certificates.Dns;

public static class DnsTsig
{
    public const string HmacSha256 = "hmac-sha256";
    public const string HmacSha512 = "hmac-sha512";
    public const int BadSignature = 16;
    public const int BadKey = 17;
    public const int BadTime = 18;
    private const int Fudge = 300;
    private const int AdditionalCountOffset = 10;

    public static IReadOnlyList<string> Algorithms { get; } = [HmacSha256, HmacSha512];

    public static byte[] Sign(byte[] message, DnsTsigKey key, DateTimeOffset signedAt)
    {
        var seconds = signedAt.ToUnixTimeSeconds();
        var variables = new DnsWriter()
            .Name(key.Name).TwoBytes((int)DnsClass.Any).FourBytes(0)
            .Name(key.Algorithm).SixBytes(seconds).TwoBytes(Fudge).TwoBytes(0).TwoBytes(0)
            .ToArray();
        var mac = Mac(key, [.. message, .. variables]);
        var id = BinaryPrimitives.ReadUInt16BigEndian(message);
        var signature = new DnsWriter()
            .Name(key.Algorithm).SixBytes(seconds).TwoBytes(Fudge).TwoBytes(mac.Length).Bytes(mac).TwoBytes(id).TwoBytes(0).TwoBytes(0);
        var signed = new DnsWriter()
            .Bytes(message)
            .Name(key.Name).TwoBytes((int)DnsRecordType.Tsig).TwoBytes((int)DnsClass.Any).FourBytes(0)
            .Data(signature)
            .ToArray();
        var additionals = BinaryPrimitives.ReadUInt16BigEndian(signed.AsSpan(AdditionalCountOffset));
        BinaryPrimitives.WriteUInt16BigEndian(signed.AsSpan(AdditionalCountOffset), (ushort)(additionals + 1));
        return signed;
    }

    private static byte[] Mac(DnsTsigKey key, byte[] data) => key.Algorithm switch
    {
        HmacSha256 => HMACSHA256.HashData(key.Secret, data),
        HmacSha512 => HMACSHA512.HashData(key.Secret, data),
        _ => throw new ArgumentException("The TSIG algorithm isn't supported.", nameof(key)),
    };
}
