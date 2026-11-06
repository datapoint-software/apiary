namespace Datapoint.Apiary.Certificates.Dns;

public sealed record DnsRecord(string Name, DnsRecordType Type, DnsClass Class, uint Ttl, string Data);
