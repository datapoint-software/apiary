namespace Datapoint.Apiary.Certificates.Dns;

public sealed class DnsException(string code, string? detail, Exception? inner = null)
    : Exception($"{code}: {detail}", inner)
{
    public string Code { get; } = code;

    public string? Detail { get; } = detail;
}
