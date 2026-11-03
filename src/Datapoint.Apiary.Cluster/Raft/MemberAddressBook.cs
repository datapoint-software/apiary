using System.Buffers.Binary;
using System.Net;
using System.Text;
using DotNext.Buffers;
using DotNext.Buffers.Binary;
using DotNext.Net.Cluster.Consensus.Raft.Membership;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed class MemberAddressBook(string fileName) : PersistentClusterConfigurationStorage<EndPoint>(fileName)
{
    public static IReadOnlyList<IPEndPoint> Read(string fileName)
    {
        if (!File.Exists(fileName))
        {
            return [];
        }

        var bytes = File.ReadAllBytes(fileName).AsSpan(sizeof(long));
        var count = BinaryPrimitives.ReadInt32LittleEndian(bytes);
        var addresses = new List<IPEndPoint>(count);
        var offset = sizeof(int);
        for (var i = 0; i < count; i++)
        {
            var length = BinaryPrimitives.ReadInt32LittleEndian(bytes[offset..]);
            offset += sizeof(int);
            addresses.Add(IPEndPoint.Parse(Encoding.UTF8.GetString(bytes.Slice(offset, length))));
            offset += length;
        }

        return addresses;
    }

    public static void Rewrite(string fileName, IReadOnlyList<IPEndPoint> addresses)
    {
        var existing = File.ReadAllBytes(fileName);
        using var stream = new MemoryStream();
        stream.Write(existing.AsSpan(0, sizeof(long)));
        Span<byte> number = stackalloc byte[sizeof(int)];
        BinaryPrimitives.WriteInt32LittleEndian(number, addresses.Count);
        stream.Write(number);
        foreach (var address in addresses)
        {
            var text = Encoding.UTF8.GetBytes(address.ToString());
            BinaryPrimitives.WriteInt32LittleEndian(number, text.Length);
            stream.Write(number);
            stream.Write(text);
        }

        var temporary = fileName + ".tmp";
        File.WriteAllBytes(temporary, stream.ToArray());
        File.Move(temporary, fileName, overwrite: true);
    }

    protected override void Encode(EndPoint address, ref BufferWriterSlim<byte> writer)
    {
        var text = Encoding.UTF8.GetBytes(address.ToString() ?? "");
        writer.WriteLittleEndian(text.Length);
        writer.Write(text);
    }

    protected override EndPoint Decode(ref SequenceReader reader)
    {
        var length = reader.ReadLittleEndian<int>();
        var text = new byte[length];
        reader.Read(text);
        return IPEndPoint.Parse(Encoding.UTF8.GetString(text));
    }
}
