using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Datapoint.Apiary.Cluster.Trust;

public sealed class ReplicaCredentials : IDisposable
{
    private readonly X509Certificate2 _certificate;
    private readonly X509Certificate2Collection _authorities = [];

    public ReplicaCredentials(ECDsa key, string certificatePem, string authorityPems)
    {
        using var issued = X509Certificate2.CreateFromPem(certificatePem);
        using var withKey = issued.CopyWithPrivateKey(key);
        _certificate = X509CertificateLoader.LoadPkcs12(withKey.Export(X509ContentType.Pkcs12), null);
        CertificatePem = certificatePem;
        _authorities.ImportFromPem(authorityPems);
        AuthorityPems = authorityPems;
    }

    public X509Certificate2 Certificate => _certificate;

    public DateTimeOffset NotAfter => new(_certificate.NotAfter);

    public string AuthorityPems { get; }

    public string CertificatePem { get; }

    public byte[] ExportPrivateKey()
    {
        using var key = _certificate.GetECDsaPrivateKey()!;
        return key.ExportPkcs8PrivateKey();
    }

    public static SslServerAuthenticationOptions ServerOptions(Func<ReplicaCredentials?> current) => new()
    {
        ServerCertificateSelectionCallback = (_, _) => current()?.Certificate!,
        ClientCertificateRequired = true,
        RemoteCertificateValidationCallback = (_, certificate, _, _) => current()?.IsTrusted(certificate) is true,
    };

    public static SslClientAuthenticationOptions ClientOptions(Func<ReplicaCredentials?> current) => new()
    {
        TargetHost = "apiary",
        LocalCertificateSelectionCallback = (_, _, _, _, _) => current()?.Certificate!,
        RemoteCertificateValidationCallback = (_, certificate, _, _) => current()?.IsTrusted(certificate) is true,
    };

    public ReplicaCredentials WithAuthorities(string authorityPems)
    {
        using var key = _certificate.GetECDsaPrivateKey()!;
        return new ReplicaCredentials(key, CertificatePem, authorityPems);
    }

    public bool IsIssuedBy(string authorityPem)
    {
        using var authority = X509Certificate2.CreateFromPem(authorityPem);
        return Builds(_certificate, [authority]);
    }

    public bool IsTrusted(X509Certificate? certificate)
    {
        if (certificate is null)
        {
            return false;
        }

        var leaf = certificate as X509Certificate2 ?? X509CertificateLoader.LoadCertificate(certificate.GetRawCertData());
        try
        {
            return Builds(leaf, _authorities) && ClusterAuthority.ReplicaId(leaf) is not null;
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
        foreach (var authority in _authorities)
        {
            authority.Dispose();
        }
    }

    private static bool Builds(X509Certificate2 leaf, X509Certificate2Collection authorities)
    {
        using var chain = new X509Chain();
        chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
        chain.ChainPolicy.CustomTrustStore.AddRange(authorities);
        chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
        return chain.Build(leaf);
    }
}
