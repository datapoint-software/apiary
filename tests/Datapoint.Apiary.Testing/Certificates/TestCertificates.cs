using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Datapoint.Apiary.Testing.Certificates;

public static class TestCertificates
{
    public static PemBundle SelfSigned(params string[] hosts) => SelfSigned(TestClock.Now.AddDays(-1), TestClock.Now.AddDays(89), hosts);

    public static PemBundle SelfSigned(DateTimeOffset notBefore, DateTimeOffset notAfter, params string[] hosts)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        using var certificate = Request(key, "CN=" + (hosts.FirstOrDefault() ?? "Test"), hosts).CreateSelfSigned(notBefore, notAfter);
        return new(certificate.ExportCertificatePem(), key.ExportPkcs8PrivateKeyPem());
    }

    public static PemBundle IssuedByCa(bool includeCa, params string[] hosts)
    {
        using var caKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var caRequest = new CertificateRequest("CN=Test CA", caKey, HashAlgorithmName.SHA256);
        caRequest.CertificateExtensions.Add(new X509BasicConstraintsExtension(certificateAuthority: true, hasPathLengthConstraint: false, pathLengthConstraint: 0, critical: true));
        caRequest.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.KeyCertSign, critical: true));
        using var ca = caRequest.CreateSelfSigned(TestClock.Now.AddDays(-10), TestClock.Now.AddDays(365));
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        using var leaf = Request(key, "CN=" + hosts[0], hosts).Create(ca, TestClock.Now.AddDays(-1), TestClock.Now.AddDays(89), RandomNumberGenerator.GetBytes(16));
        var chain = includeCa ? leaf.ExportCertificatePem() + "\n" + ca.ExportCertificatePem() : leaf.ExportCertificatePem();
        return new(chain, key.ExportPkcs8PrivateKeyPem());
    }

    public static string AnotherKey()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        return key.ExportPkcs8PrivateKeyPem();
    }

    public static string EncryptedKey()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        return key.ExportEncryptedPkcs8PrivateKeyPem("secret", new PbeParameters(PbeEncryptionAlgorithm.Aes256Cbc, HashAlgorithmName.SHA256, 1000));
    }

    private static CertificateRequest Request(ECDsa key, string subject, string[] hosts)
    {
        var request = new CertificateRequest(subject, key, HashAlgorithmName.SHA256);
        if (hosts.Length > 0)
        {
            var names = new SubjectAlternativeNameBuilder();
            foreach (var host in hosts)
            {
                names.AddDnsName(host);
            }

            request.CertificateExtensions.Add(names.Build());
        }

        return request;
    }
}
