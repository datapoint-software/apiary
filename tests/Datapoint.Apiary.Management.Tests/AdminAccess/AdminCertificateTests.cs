using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.AdminAccess;
using Datapoint.Apiary.Testing.Certificates;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Tests.AdminAccess;

public sealed class AdminCertificateTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public AdminCertificateTests() => _host.SignedIn();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task There_is_no_admin_certificate_until_the_cluster_creates_one()
    {
        Assert.Null(await _host.QueryAsync(new GetAdminCertificate()));
    }

    [Fact]
    public async Task An_uploaded_admin_certificate_replaces_the_self_signed_one()
    {
        await _host.SendAsync(new ResetAdminCertificate());
        var bundle = TestCertificates.SelfSigned("apiary.internal.example.com");

        var view = await _host.SendAsync(new UploadAdminCertificate(bundle.ChainPem, bundle.KeyPem));

        Assert.Equal((false, "apiary.internal.example.com", "ana@example.com"), (view.SelfSigned, view.Hosts.Single(), view.ChangedBy));
        Assert.Equal(view.Fingerprint, (await _host.QueryAsync(new GetAdminCertificate()))?.Fingerprint);
    }

    [Fact]
    public async Task Resetting_goes_back_to_a_new_self_signed_certificate_for_localhost()
    {
        var view = await _host.SendAsync(new ResetAdminCertificate());

        Assert.Equal((true, "localhost"), (view.SelfSigned, view.Hosts[0]));
    }

    [Fact]
    public async Task Each_reset_makes_a_new_key()
    {
        var first = await _host.SendAsync(new ResetAdminCertificate());

        var second = await _host.SendAsync(new ResetAdminCertificate());

        Assert.NotEqual(first.Fingerprint, second.Fingerprint);
    }

    [Fact]
    public async Task An_admin_certificate_s_key_must_match()
    {
        var bundle = TestCertificates.SelfSigned("apiary.internal.example.com");

        Assert.Contains("KeyPem: certificate.keyMismatch", await _host.ErrorsAsync(new UploadAdminCertificate(bundle.ChainPem, TestCertificates.AnotherKey())));
    }

    [Fact]
    public void The_admin_certificate_view_never_includes_the_private_key()
    {
        Assert.DoesNotContain(typeof(AdminCertificateView).GetProperties(), p => p.Name.Contains("Key", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Only_an_administrator_changes_the_admin_certificate()
    {
        _host.SignedIn(Role.Operator, "bea@example.com");

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new ResetAdminCertificate()));
    }
}
