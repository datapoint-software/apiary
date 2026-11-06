namespace Datapoint.Apiary.Certificates.Dns;

public enum DnsRecordType
{
    A = 1,
    NS = 2,
    CName = 5,
    Soa = 6,
    Txt = 16,
    Aaaa = 28,
    Tsig = 250,
}
