namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsOptions
{
    public const int DefaultPort = 53;
    public const string ResolverFile = "/etc/resolv.conf";

    public string? Resolvers { get; set; }

    public int ServerPort { get; set; } = DefaultPort;
}
