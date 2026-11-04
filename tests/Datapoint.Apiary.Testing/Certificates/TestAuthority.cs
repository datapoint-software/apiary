using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Datapoint.Apiary.Testing.Certificates;

public sealed class TestAuthority : IDisposable
{
    private readonly ECDsa _key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    private readonly X509Certificate2 _certificate;

    public TestAuthority(string name = "Test CA")
    {
        var request = new CertificateRequest("CN=" + name, _key, HashAlgorithmName.SHA256);
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(certificateAuthority: true, hasPathLengthConstraint: false, pathLengthConstraint: 0, critical: true));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.KeyCertSign, critical: true));
        _certificate = request.CreateSelfSigned(TestClock.Now.AddYears(-1), TestClock.Now.AddYears(5));
    }

    public string Sign(byte[] signingRequest, DateTimeOffset notBefore, DateTimeOffset notAfter)
    {
        var request = CertificateRequest.LoadSigningRequest(signingRequest, HashAlgorithmName.SHA256, CertificateRequestLoadOptions.UnsafeLoadCertificateExtensions);
        using var leaf = request.Create(_certificate, notBefore, notAfter, RandomNumberGenerator.GetBytes(16));
        return leaf.ExportCertificatePem() + "\n" + _certificate.ExportCertificatePem() + "\n";
    }

    public void Dispose()
    {
        _certificate.Dispose();
        _key.Dispose();
    }
}
