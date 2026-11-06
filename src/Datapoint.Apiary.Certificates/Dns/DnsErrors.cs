namespace Datapoint.Apiary.Certificates.Dns;

public static class DnsErrors
{
    public const string Unauthorized = "dns.unauthorized";
    public const string ZoneNotFound = "dns.zoneNotFound";
    public const string NotPropagated = "dns.notPropagated";
    public const string Unreachable = "dns.unreachable";
    public const string CnameMissing = "dns.cnameMissing";
}
