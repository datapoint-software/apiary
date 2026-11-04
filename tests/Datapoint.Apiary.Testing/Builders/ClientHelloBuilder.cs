using System.Buffers.Binary;
using System.Text;

namespace Datapoint.Apiary.Testing.Builders;

public sealed record ClientHelloBuilder
{
    public const byte HostNameKind = 0;
    private const ushort ServerNameType = 0;

    private ClientHelloBuilder()
    {
    }

    public byte MessageType { get; init; } = 1;

    public IReadOnlyList<byte[]> Extensions { get; init; } = [];

    public static ClientHelloBuilder AClientHello() => new();

    public static byte[] ServerNameEntry(string name, byte kind = HostNameKind)
    {
        var bytes = Encoding.ASCII.GetBytes(name);
        return [kind, .. UInt16(bytes.Length), .. bytes];
    }

    public ClientHelloBuilder WithServerName(string name) => WithServerNameEntries(ServerNameEntry(name));

    public ClientHelloBuilder WithServerNameEntries(params byte[][] entries)
    {
        byte[] list = [.. entries.SelectMany(e => e)];
        return WithExtension(ServerNameType, [.. UInt16(list.Length), .. list]);
    }

    public ClientHelloBuilder WithExtension(ushort type, byte[] data) =>
        this with { Extensions = [.. Extensions, [.. UInt16(type), .. UInt16(data.Length), .. data]] };

    public byte[] Message()
    {
        byte[] extensions = [.. Extensions.SelectMany(e => e)];
        byte[] body =
        [
            3, 3,
            .. new byte[32],
            0,
            .. UInt16(2), 0x13, 0x01,
            1, 0,
            .. UInt16(extensions.Length), .. extensions,
        ];
        return [MessageType, (byte)(body.Length >> 16), (byte)(body.Length >> 8), (byte)body.Length, .. body];
    }

    public byte[] Record()
    {
        var message = Message();
        return [22, 3, 1, .. UInt16(message.Length), .. message];
    }

    private static byte[] UInt16(int value)
    {
        var bytes = new byte[2];
        BinaryPrimitives.WriteUInt16BigEndian(bytes, (ushort)value);
        return bytes;
    }
}
