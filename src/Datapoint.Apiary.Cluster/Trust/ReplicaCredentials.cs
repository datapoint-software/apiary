using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Datapoint.Apiary.Cluster.Trust;

public sealed class ReplicaCredentials : IDisposable
{
    private readonly X509Certificate2 _certificate;
    private readonly X509Certificate2 _authority;
    private readonly SslStreamCertificateContext _context;

    public ReplicaCredentials(ECDsa key, string certificatePem, string authorityPem)
    {
        using var issued = X509Certificate2.CreateFromPem(certificatePem);
        using var withKey = issued.CopyWithPrivateKey(key);
        _certificate = X509CertificateLoader.LoadPkcs12(withKey.Export(X509ContentType.Pkcs12), null);
        _authority = X509Certificate2.CreateFromPem(authorityPem);
        _context = SslStreamCertificateContext.Create(_certificate, [_authority], offline: true);
    }

    public X509Certificate2 Certificate => _certificate;

    public DateTimeOffset NotAfter => new(_certificate.NotAfter);

    public SslServerAuthenticationOptions ServerOptions(bool requireClientCertificate) => new()
    {
        ServerCertificateContext = _context,
        ClientCertificateRequired = requireClientCertificate,
        RemoteCertificateValidationCallback = (_, certificate, _, _) => !requireClientCertificate || IsTrusted(certificate),
    };

    public SslClientAuthenticationOptions ClientOptions() => new()
    {
        TargetHost = "apiary",
        ClientCertificateContext = _context,
        RemoteCertificateValidationCallback = (_, certificate, _, _) => IsTrusted(certificate),
    };

    public bool IsTrusted(X509Certificate? certificate)
    {
        if (certificate is null)
        {
            return false;
        }

        using var chain = new X509Chain();
        chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
        chain.ChainPolicy.CustomTrustStore.Add(_authority);
        chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
        var leaf = certificate as X509Certificate2 ?? X509CertificateLoader.LoadCertificate(certificate.GetRawCertData());
        try
        {
            return chain.Build(leaf) && ClusterAuthority.ReplicaId(leaf) is not null;
        }
        finally
        {
            if (!ReferenceEquals(leaf, certificate))
            {
                leaf.Dispose();
            }
        }
    }

    public void Dispose()
    {
        _certificate.Dispose();
        _authority.Dispose();
    }
}
