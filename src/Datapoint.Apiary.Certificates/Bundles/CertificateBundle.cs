using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Datapoint.Apiary.Cluster.Certificates;

namespace Datapoint.Apiary.Certificates.Bundles;

public sealed record CertificateBundle(CertificateMaterial? Material, CertificateProblem Problem)
{
    private const string SubjectAlternativeNameOid = "2.5.29.17";

    public static CertificateBundle Check(string chainPem, string keyPem, DateTimeOffset now, bool requireCompleteChain = true)
    {
        var chain = ReadChain(chainPem);
        if (chain.Count == 0)
        {
            return Failed(CertificateProblem.PemInvalid);
        }

        try
        {
            var problem = CheckKey(chain[0], keyPem);
            if (problem != CertificateProblem.None)
            {
                return Failed(problem);
            }

            var leaf = chain[0];
            if (leaf.NotAfter.ToUniversalTime() <= now.UtcDateTime)
            {
                return Failed(CertificateProblem.Expired);
            }

            if (leaf.NotBefore.ToUniversalTime() > now.UtcDateTime)
            {
                return Failed(CertificateProblem.NotYetValid);
            }

            var hosts = Hostnames(leaf);
            if (hosts.Count == 0)
            {
                return Failed(CertificateProblem.NoHostnames);
            }

            if (requireCompleteChain && !IsComplete(chain))
            {
                return Failed(CertificateProblem.ChainIncomplete);
            }

            var material = new CertificateMaterial(
                Normalize(chain),
                keyPem.Trim() + "\n",
                hosts,
                IssuerName(leaf),
                new DateTimeOffset(leaf.NotBefore.ToUniversalTime()),
                new DateTimeOffset(leaf.NotAfter.ToUniversalTime()),
                leaf.GetCertHashString(HashAlgorithmName.SHA256),
                chain.Count);
            return new CertificateBundle(material, CertificateProblem.None);
        }
        finally
        {
            Dispose(chain);
        }
    }

    public static void Dispose(IEnumerable<X509Certificate2> chain)
    {
        foreach (var certificate in chain)
        {
            certificate.Dispose();
        }
    }

    public static IReadOnlyList<X509Certificate2> ReadChain(string pem)
    {
        var chain = new List<X509Certificate2>();
        var remaining = pem.AsSpan();
        while (PemEncoding.TryFind(remaining, out var fields))
        {
            if (remaining[fields.Label].SequenceEqual("CERTIFICATE"))
            {
                try
                {
                    chain.Add(X509CertificateLoader.LoadCertificate(Convert.FromBase64String(remaining[fields.Base64Data].ToString())));
                }
                catch (CryptographicException)
                {
                    Dispose(chain);
                    return [];
                }
            }

            remaining = remaining[fields.Location.End..];
        }

        return chain;
    }

    private static CertificateBundle Failed(CertificateProblem problem) => new(null, problem);

    private static CertificateProblem CheckKey(X509Certificate2 leaf, string keyPem)
    {
        if (keyPem.Contains("ENCRYPTED", StringComparison.Ordinal))
        {
            return CertificateProblem.KeyEncrypted;
        }

        try
        {
            using var withKey = WithKey(leaf, keyPem);
            return withKey is null ? CertificateProblem.KeyInvalid : CertificateProblem.None;
        }
        catch (ArgumentException)
        {
            return CertificateProblem.KeyInvalid;
        }
        catch (CryptographicException)
        {
            return CertificateProblem.KeyMismatch;
        }
        catch (InvalidOperationException)
        {
            return CertificateProblem.KeyMismatch;
        }
    }

    public static X509Certificate2? WithKey(X509Certificate2 leaf, string keyPem)
    {
        using var ecdsaPublic = leaf.GetECDsaPublicKey();
        if (ecdsaPublic is not null)
        {
            using var ecdsa = ECDsa.Create();
            ecdsa.ImportFromPem(keyPem);
            return leaf.CopyWithPrivateKey(ecdsa);
        }

        using var rsaPublic = leaf.GetRSAPublicKey();
        if (rsaPublic is null)
        {
            return null;
        }

        using var rsa = RSA.Create();
        rsa.ImportFromPem(keyPem);
        return leaf.CopyWithPrivateKey(rsa);
    }

    private static bool IsComplete(IReadOnlyList<X509Certificate2> chain)
    {
        using var builder = new X509Chain();
        builder.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
        builder.ChainPolicy.DisableCertificateDownloads = true;
        builder.ChainPolicy.ExtraStore.AddRange(chain.Skip(1).ToArray());
        builder.ChainPolicy.VerificationFlags = X509VerificationFlags.AllowUnknownCertificateAuthority;
        builder.Build(chain[0]);
        return builder.ChainStatus.All(s => s.Status is not X509ChainStatusFlags.PartialChain)
            && builder.ChainElements.Count > 0
            && IsRoot(builder.ChainElements[^1].Certificate);
    }

    private static bool IsRoot(X509Certificate2 certificate) => certificate.SubjectName.RawData.AsSpan().SequenceEqual(certificate.IssuerName.RawData);

    private static List<string> Hostnames(X509Certificate2 leaf)
    {
        var hosts = new List<string>();
        foreach (var extension in leaf.Extensions)
        {
            if (extension.Oid?.Value != SubjectAlternativeNameOid)
            {
                continue;
            }

            hosts.AddRange(new X509SubjectAlternativeNameExtension(extension.RawData).EnumerateDnsNames().Select(h => h.ToLowerInvariant()));
        }

        return [.. hosts.Distinct(StringComparer.Ordinal)];
    }

    private static string IssuerName(X509Certificate2 leaf)
    {
        var name = leaf.IssuerName.EnumerateRelativeDistinguishedNames()
            .FirstOrDefault(n => n.GetSingleElementType().Value == "2.5.4.3")
            ?? leaf.IssuerName.EnumerateRelativeDistinguishedNames().FirstOrDefault(n => n.GetSingleElementType().Value == "2.5.4.10");
        return name?.GetSingleElementValue() ?? leaf.Issuer;
    }

    private static string Normalize(IReadOnlyList<X509Certificate2> chain)
    {
        var builder = new StringBuilder();
        foreach (var certificate in chain)
        {
            builder.Append(PemEncoding.WriteString("CERTIFICATE", certificate.RawData)).Append('\n');
        }

        return builder.ToString();
    }
}
