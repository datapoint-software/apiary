namespace Datapoint.Apiary.Certificates.Dns;

public static class DnsMessages
{
    public const uint RecordTtl = 60;
    private const int RecursionDesired = 0x0100;
    private const int UpdateOpcode = 5 << 11;

    public static byte[] Query(ushort id, string name, DnsRecordType type, bool recursionDesired) =>
        new DnsWriter()
            .TwoBytes(id).TwoBytes(recursionDesired ? RecursionDesired : 0).TwoBytes(1).TwoBytes(0).TwoBytes(0).TwoBytes(0)
            .Name(name).TwoBytes((int)type).TwoBytes((int)DnsClass.Internet)
            .ToArray();

    public static byte[] Update(ushort id, string zone, string name, string value, DnsUpdateKind kind)
    {
        var isAdd = kind == DnsUpdateKind.Add;
        return new DnsWriter()
            .TwoBytes(id).TwoBytes(UpdateOpcode).TwoBytes(1).TwoBytes(0).TwoBytes(1).TwoBytes(0)
            .Name(zone).TwoBytes((int)DnsRecordType.Soa).TwoBytes((int)DnsClass.Internet)
            .Name(name).TwoBytes((int)DnsRecordType.Txt).TwoBytes((int)(isAdd ? DnsClass.Internet : DnsClass.None)).FourBytes(isAdd ? RecordTtl : 0)
            .Data(new DnsWriter().CharacterStrings(value))
            .ToArray();
    }
}
