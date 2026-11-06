using System.Buffers.Binary;
using System.Net;
using System.Text;

namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsReader(byte[] message)
{
    private const int MaximumPointers = 32;
    private const int PointerMask = 0xC0;

    public int Offset { get; private set; }

    public ushort TwoBytes()
    {
        var value = BinaryPrimitives.ReadUInt16BigEndian(Span(Offset, 2));
        Offset += 2;
        return value;
    }

    public uint FourBytes()
    {
        var value = BinaryPrimitives.ReadUInt32BigEndian(Span(Offset, 4));
        Offset += 4;
        return value;
    }

    public void Skip(int count)
    {
        Span(Offset, count);
        Offset += count;
    }

    public string Name()
    {
        var (name, end) = NameAt(Offset);
        Offset = end;
        return name;
    }

    public DnsRecord Record()
    {
        var name = Name();
        var type = (DnsRecordType)TwoBytes();
        var recordClass = (DnsClass)TwoBytes();
        var ttl = FourBytes();
        var length = TwoBytes();
        var start = Offset;
        Skip(length);
        return new DnsRecord(name, type, recordClass, ttl, Data(type, start, length));
    }

    private string Data(DnsRecordType type, int start, int length) => type switch
    {
        DnsRecordType.NS or DnsRecordType.CName => NameAt(start).Name,
        DnsRecordType.Txt => CharacterStrings(start, length),
        DnsRecordType.A when length == 4 => new IPAddress(Span(start, length)).ToString(),
        DnsRecordType.Aaaa when length == 16 => new IPAddress(Span(start, length)).ToString(),
        DnsRecordType.Tsig => TsigError(start).ToString(System.Globalization.CultureInfo.InvariantCulture),
        _ => string.Empty,
    };

    private string CharacterStrings(int start, int length)
    {
        var text = new StringBuilder();
        for (var position = start; position < start + length;)
        {
            var size = Span(position, 1)[0];
            text.Append(Encoding.ASCII.GetString(Span(position + 1, size)));
            position += 1 + size;
        }

        return text.ToString();
    }

    private int TsigError(int start)
    {
        var position = NameAt(start).End + 6 + 2;
        var macSize = BinaryPrimitives.ReadUInt16BigEndian(Span(position, 2));
        return BinaryPrimitives.ReadUInt16BigEndian(Span(position + 2 + macSize + 2, 2));
    }

    private (string Name, int End) NameAt(int start)
    {
        var labels = new List<string>();
        var position = start;
        var end = -1;
        var length = 0;
        for (var pointers = 0; pointers <= MaximumPointers;)
        {
            var size = Span(position, 1)[0];
            if (size == 0)
            {
                return (string.Join('.', labels), end < 0 ? position + 1 : end);
            }

            if ((size & PointerMask) == PointerMask)
            {
                end = end < 0 ? position + 2 : end;
                position = ((size & ~PointerMask) << 8) | Span(position + 1, 1)[0];
                pointers++;
                continue;
            }

            length += size + 1;
            if ((size & PointerMask) != 0 || length >= DnsWriter.MaximumNameLength)
            {
                throw Malformed();
            }

            labels.Add(Encoding.ASCII.GetString(Span(position + 1, size)).ToLowerInvariant());
            position += 1 + size;
        }

        throw Malformed();
    }

    private ReadOnlySpan<byte> Span(int start, int count) =>
        start >= 0 && count >= 0 && start + count <= message.Length ? message.AsSpan(start, count) : throw Malformed();

    private static DnsException Malformed() => new(DnsErrors.Unreachable, "A DNS server sent a malformed answer.");
}
