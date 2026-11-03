namespace Datapoint.Apiary.Management.Certificates;

public sealed record CertificatePreview(IReadOnlyList<string> Hosts, string Issuer, DateTimeOffset NotBefore, DateTimeOffset NotAfter, int ChainLength);
