using System.Globalization;

namespace Datapoint.Apiary.Certificates.Dns;

public sealed record DnsResponse(
    ushort Id,
    bool Truncated,
    DnsResponseCode Code,
    IReadOnlyList<DnsRecord> Answers,
    IReadOnlyList<DnsRecord> Authorities,
    IReadOnlyList<DnsRecord> Additionals)
{
    private const int TruncatedFlag = 0x0200;
    private const int CodeMask = 0x000F;

    public int TsigError =>
        Additionals.FirstOrDefault(r => r.Type == DnsRecordType.Tsig) is { } tsig ? int.Parse(tsig.Data, CultureInfo.InvariantCulture) : 0;

    public static DnsResponse Parse(byte[] message)
    {
        var reader = new DnsReader(message);
        var id = reader.TwoBytes();
        var flags = reader.TwoBytes();
        var questions = reader.TwoBytes();
        var answers = reader.TwoBytes();
        var authorities = reader.TwoBytes();
        var additionals = reader.TwoBytes();
        for (var i = 0; i < questions; i++)
        {
            reader.Name();
            reader.Skip(4);
        }

        return new DnsResponse(
            id,
            (flags & TruncatedFlag) != 0,
            (DnsResponseCode)(flags & CodeMask),
            Records(reader, answers),
            Records(reader, authorities),
            Records(reader, additionals));
    }

    private static List<DnsRecord> Records(DnsReader reader, int count)
    {
        var records = new List<DnsRecord>(count);
        for (var i = 0; i < count; i++)
        {
            records.Add(reader.Record());
        }

        return records;
    }
}
