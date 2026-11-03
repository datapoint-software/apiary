namespace Datapoint.Apiary.Cluster.Certificates;

public sealed record AdminCertificate(CertificateMaterial Material, bool SelfSigned, DateTimeOffset ChangedAt, string? ChangedBy)
{
    public string Fingerprint => string.Join(':', Enumerable.Range(0, Material.Thumbprint.Length / 2).Select(i => Material.Thumbprint.Substring(i * 2, 2)));
}
