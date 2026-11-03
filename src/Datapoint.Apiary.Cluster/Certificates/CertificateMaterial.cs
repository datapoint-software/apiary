namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record CertificateMaterial(
    string ChainPem,
    string KeyPem,
    IReadOnlyList<string> Hosts,
    string Issuer,
    DateTimeOffset NotBefore,
    DateTimeOffset NotAfter,
    string Thumbprint,
    int ChainLength);
