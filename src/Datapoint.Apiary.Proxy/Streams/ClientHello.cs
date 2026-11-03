using System.Buffers.Binary;
using System.Text;

namespace Datapoint.Apiary.Proxy.Streams;

public static class ClientHello
{
    public const int HeaderSize = 5;
    public const int MaximumRecord = 16384;

    private const byte Handshake = 22;
    private const byte ClientHelloType = 1;
    private const ushort ServerNameExtension = 0;
    private const byte HostName = 0;

    public static int? RecordLength(ReadOnlySpan<byte> header) =>
        header.Length >= HeaderSize && header[0] == Handshake && header[1] == 3
            ? BinaryPrimitives.ReadUInt16BigEndian(header[3..]) is var length and > 0 and <= MaximumRecord ? length : null
            : null;

    public static string? ServerName(ReadOnlySpan<byte> record)
    {
        var reader = new Reader(record);
        if (reader.Byte() != ClientHelloType)
        {
            return null;
        }

        reader.Skip(3 + 2 + 32);
        reader.Skip(reader.Byte());
        reader.Skip(reader.UInt16());
        reader.Skip(reader.Byte());
        var extensions = new Reader(reader.Take(reader.UInt16()));
        while (extensions.Remaining >= 4)
        {
            var type = extensions.UInt16();
            var data = extensions.Take(extensions.UInt16());
            if (type == ServerNameExtension)
            {
                return HostNameIn(data);
            }
        }

        return null;
    }

    private static string? HostNameIn(ReadOnlySpan<byte> data)
    {
        var list = new Reader(data);
        var names = new Reader(list.Take(list.UInt16()));
        while (names.Remaining >= 3)
        {
            var kind = names.Byte();
            var name = names.Take(names.UInt16());
            if (kind == HostName && name.Length is > 0 and <= 253)
            {
                return Encoding.ASCII.GetString(name).ToLowerInvariant();
            }
        }

        return null;
    }

    private ref struct Reader(ReadOnlySpan<byte> data)
    {
        private ReadOnlySpan<byte> _data = data;
        private bool _failed;

        public readonly int Remaining => _failed ? 0 : _data.Length;

        public byte Byte() => Take(1) is [var value] ? value : (byte)0;

        public ushort UInt16() => Take(2) is { Length: 2 } bytes ? BinaryPrimitives.ReadUInt16BigEndian(bytes) : (ushort)0;

        public void Skip(int count) => Take(count);

        public ReadOnlySpan<byte> Take(int count)
        {
            if (_failed || count > _data.Length)
            {
                _failed = true;
                _data = [];
                return [];
            }

            var taken = _data[..count];
            _data = _data[count..];
            return taken;
        }
    }
}
