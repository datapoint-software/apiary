using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Cluster.Replicas;

namespace Datapoint.Apiary.Cluster.Trust;

public static class ClusterAuthority
{
    public static readonly TimeSpan CaLifetime = TimeSpan.FromDays(730);
    public static readonly TimeSpan ReplicaLifetime = TimeSpan.FromDays(90);
    private static readonly TimeSpan s_clockSkew = TimeSpan.FromMinutes(5);

    public static ClusterCa Create(DateTimeOffset now)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var request = new CertificateRequest("CN=Apiary cluster CA", key, HashAlgorithmName.SHA256);
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(true, true, 0, true));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.KeyCertSign | X509KeyUsageFlags.CrlSign, true));
        request.CertificateExtensions.Add(new X509SubjectKeyIdentifierExtension(request.PublicKey, false));
        using var certificate = request.CreateSelfSigned(now - s_clockSkew, now + CaLifetime);
        return new ClusterCa(certificate.ExportCertificatePem(), key.ExportPkcs8PrivateKeyPem(), new DateTimeOffset(certificate.NotAfter));
    }

    public static string Issue(ClusterCa ca, ReadOnlySpan<byte> subjectPublicKeyInfo, Guid replicaId, DateTimeOffset now)
    {
        using var publicKey = ECDsa.Create();
        publicKey.ImportSubjectPublicKeyInfo(subjectPublicKeyInfo, out _);
        var request = new CertificateRequest($"CN={replicaId:N}", publicKey, HashAlgorithmName.SHA256);
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature, true));
        request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(
            [new Oid("1.3.6.1.5.5.7.3.1"), new Oid("1.3.6.1.5.5.7.3.2")], false));
        using var issuer = X509Certificate2.CreateFromPem(ca.CertificatePem, ca.KeyPem);
        var notAfter = Min(now + ReplicaLifetime, new DateTimeOffset(issuer.NotAfter));
        using var certificate = request.Create(issuer, now - s_clockSkew, notAfter, RandomNumberGenerator.GetBytes(16));
        return certificate.ExportCertificatePem();
    }

    public static Guid? ReplicaId(X509Certificate2 certificate) =>
        Guid.TryParseExact(certificate.GetNameInfo(X509NameType.SimpleName, forIssuer: false), "N", out var id) ? id : null;

    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;
}
