using System.Buffers.Binary;
using System.Text;

namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsWriter
{
    public const int MaximumNameLength = 255;
    private const int MaximumLabelLength = 63;
    private const int MaximumStringLength = 255;
    private readonly List<byte> _bytes = [];

    public DnsWriter TwoBytes(int value)
    {
        _bytes.Add((byte)(value >> 8));
        _bytes.Add((byte)value);
        return this;
    }

    public DnsWriter FourBytes(uint value)
    {
        Span<byte> bytes = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(bytes, value);
        _bytes.AddRange(bytes);
        return this;
    }

    public DnsWriter SixBytes(long value)
    {
        TwoBytes((int)(value >> 32));
        return FourBytes((uint)value);
    }

    public DnsWriter Bytes(ReadOnlySpan<byte> bytes)
    {
        _bytes.AddRange(bytes);
        return this;
    }

    public DnsWriter Name(string name)
    {
        var labels = DnsNames.Normalize(name).Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (labels.Sum(l => l.Length + 1) + 1 > MaximumNameLength)
        {
            throw new ArgumentException("The DNS name is too long.", nameof(name));
        }

        foreach (var label in labels)
        {
            Label(label);
        }

        _bytes.Add(0);
        return this;
    }

    public DnsWriter CharacterStrings(string text)
    {
        var bytes = Encoding.ASCII.GetBytes(text);
        for (var start = 0; start < bytes.Length || start == 0; start += MaximumStringLength)
        {
            var length = Math.Min(MaximumStringLength, bytes.Length - start);
            _bytes.Add((byte)length);
            _bytes.AddRange(bytes.AsSpan(start, length));
        }

        return this;
    }

    public DnsWriter Data(DnsWriter data)
    {
        TwoBytes(data._bytes.Count);
        _bytes.AddRange(data._bytes);
        return this;
    }

    public byte[] ToArray() => [.. _bytes];

    private void Label(string label)
    {
        if (label.Length > MaximumLabelLength || !Ascii.IsValid(label))
        {
            throw new ArgumentException("A DNS label is too long or not ASCII.", nameof(label));
        }

        _bytes.Add((byte)label.Length);
        _bytes.AddRange(Encoding.ASCII.GetBytes(label));
    }
}
