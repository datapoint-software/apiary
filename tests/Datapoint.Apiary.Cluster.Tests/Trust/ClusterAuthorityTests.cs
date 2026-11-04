using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.Trust;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Cluster.Tests.Trust;

public sealed class ClusterAuthorityTests
{
    [Fact]
    public void A_new_ca_lasts_two_years() =>
        Assert.Equal(TestClock.Now + ClusterAuthority.CaLifetime, ClusterAuthority.Create(TestClock.Now).NotAfter);

    [Fact]
    public void A_new_ca_is_a_certificate_authority()
    {
        using var certificate = X509Certificate2.CreateFromPem(ClusterAuthority.Create(TestClock.Now).CertificatePem);

        Assert.True(certificate.Extensions.OfType<X509BasicConstraintsExtension>().Single().CertificateAuthority);
    }

    [Fact]
    public void An_issued_certificate_names_its_replica()
    {
        var replicaId = Guid.CreateVersion7(TestClock.Now);

        using var certificate = Issue(ClusterAuthority.Create(TestClock.Now), replicaId, TestClock.Now);

        Assert.Equal(replicaId, ClusterAuthority.ReplicaId(certificate));
    }

    [Fact]
    public void An_issued_certificate_lasts_90_days()
    {
        using var certificate = Issue(ClusterAuthority.Create(TestClock.Now), Guid.CreateVersion7(TestClock.Now), TestClock.Now);

        Assert.Equal(TestClock.Now + ClusterAuthority.ReplicaLifetime, new DateTimeOffset(certificate.NotAfter));
    }

    [Fact]
    public void An_issued_certificate_doesn_t_outlive_its_ca()
    {
        var ca = ClusterAuthority.Create(TestClock.Now);
        var nearTheEnd = ca.NotAfter.AddDays(-10);

        using var certificate = Issue(ca, Guid.CreateVersion7(TestClock.Now), nearTheEnd);

        Assert.Equal(ca.NotAfter, new DateTimeOffset(certificate.NotAfter));
    }

    [Fact]
    public void An_issued_certificate_remembers_when_it_was_issued()
    {
        using var certificate = Issue(ClusterAuthority.Create(TestClock.Now), Guid.CreateVersion7(TestClock.Now), TestClock.Now);

        Assert.Equal(TestClock.Now, ClusterAuthority.IssuedAt(certificate));
    }

    [Fact]
    public void An_issued_certificate_chains_to_its_ca()
    {
        var ca = ClusterAuthority.Create(TestClock.Now);
        using var root = X509Certificate2.CreateFromPem(ca.CertificatePem);
        using var certificate = Issue(ca, Guid.CreateVersion7(TestClock.Now), TestClock.Now);
        using var chain = new X509Chain();
        chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
        chain.ChainPolicy.CustomTrustStore.Add(root);
        chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
        chain.ChainPolicy.VerificationTime = TestClock.Now.UtcDateTime;

        Assert.True(chain.Build(certificate));
    }

    [Fact]
    public void A_certificate_not_named_after_a_replica_has_no_replica_id()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        using var certificate = new CertificateRequest("CN=shop.example.com", key, HashAlgorithmName.SHA256).CreateSelfSigned(TestClock.Now, TestClock.Now.AddDays(1));

        Assert.Null(ClusterAuthority.ReplicaId(certificate));
    }

    private static X509Certificate2 Issue(ClusterCa ca, Guid replicaId, DateTimeOffset now)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        return X509Certificate2.CreateFromPem(ClusterAuthority.Issue(ca, key.ExportSubjectPublicKeyInfo(), replicaId, now));
    }
}
