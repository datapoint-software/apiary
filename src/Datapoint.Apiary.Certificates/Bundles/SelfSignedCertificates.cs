using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Cluster.Certificates;

namespace Datapoint.Apiary.Certificates.Bundles;

public static class SelfSignedCertificates
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(730);
    public static readonly TimeSpan RenewBefore = TimeSpan.FromDays(30);
    private const string ServerAuthentication = "1.3.6.1.5.5.7.3.1";

    public static CertificateMaterial Create(DateTimeOffset now)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var request = new CertificateRequest("CN=Apiary admin interface", key, HashAlgorithmName.SHA256);
        var names = new SubjectAlternativeNameBuilder();
        names.AddDnsName("localhost");
        names.AddIpAddress(IPAddress.Loopback);
        names.AddIpAddress(IPAddress.IPv6Loopback);
        request.CertificateExtensions.Add(names.Build());
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(certificateAuthority: false, hasPathLengthConstraint: false, pathLengthConstraint: 0, critical: true));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature, critical: true));
        request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension([new Oid(ServerAuthentication)], critical: false));
        using var certificate = request.CreateSelfSigned(now.AddMinutes(-5), now.Add(Lifetime));
        return CertificateBundle.Check(certificate.ExportCertificatePem(), key.ExportPkcs8PrivateKeyPem(), now, requireCompleteChain: false).Material
            ?? throw new CryptographicException("A new self-signed certificate didn't pass its own checks.");
    }
}
