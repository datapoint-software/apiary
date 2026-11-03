namespace Datapoint.Apiary.Certificates.Acme;

public sealed class AcmeException(string code, string? detail, Exception? inner = null)
    : Exception($"{code}: {detail}", inner)
{
    public string Code { get; } = code;

    public string? Detail { get; } = detail;
}
