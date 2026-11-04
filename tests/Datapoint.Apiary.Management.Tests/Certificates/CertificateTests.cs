using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Certificates;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Testing.Certificates;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Certificates;

public sealed class CertificateTests : IDisposable
{
    private readonly ManagementHost _host = new();
    private readonly Project _project;

    public CertificateTests()
    {
        _host.SignedIn(Role.Operator);
        _project = _host.AProjectIn();
    }

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_uploaded_certificate_is_named_after_its_first_host()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com", "www.shop.example.com")));

        var certificate = _host.State.Certificates[id];
        Assert.Equal(("shop.example.com", CertificateSource.Uploaded, _project.Id), (certificate.Name, certificate.Source, certificate.ProjectId));
        Assert.Equal(["shop.example.com", "www.shop.example.com"], certificate.Material!.Hosts);
    }

    [Fact]
    public async Task An_upload_is_recorded_in_the_certificate_s_history()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com")));

        var uploaded = _host.State.Certificates[id].History.Single();
        Assert.Equal((CertificateEventKind.Uploaded, "ana@example.com"), (uploaded.Kind, uploaded.By));
    }

    [Fact]
    public async Task A_certificate_signed_by_a_ca_needs_its_chain()
    {
        Assert.Contains("ChainPem: certificate.chainIncomplete", await _host.ErrorsAsync(Upload(TestCertificates.IssuedByCa(includeCa: false, "shop.example.com"))));
    }

    [Fact]
    public async Task A_certificate_with_its_chain_is_accepted()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.IssuedByCa(includeCa: true, "shop.example.com")));

        Assert.Equal((2, "Test CA"), (_host.State.Certificates[id].Material!.ChainLength, _host.State.Certificates[id].Material!.Issuer));
    }

    [Fact]
    public async Task A_key_that_doesn_t_match_the_certificate_is_refused()
    {
        var bundle = TestCertificates.SelfSigned("shop.example.com") with { KeyPem = TestCertificates.AnotherKey() };

        Assert.Contains("KeyPem: certificate.keyMismatch", await _host.ErrorsAsync(Upload(bundle)));
    }

    [Fact]
    public async Task A_key_with_a_passphrase_is_refused()
    {
        var bundle = TestCertificates.SelfSigned("shop.example.com") with { KeyPem = TestCertificates.EncryptedKey() };

        Assert.Contains("KeyPem: certificate.keyEncrypted", await _host.ErrorsAsync(Upload(bundle)));
    }

    [Fact]
    public async Task Text_that_isn_t_a_certificate_is_refused()
    {
        Assert.Contains("ChainPem: certificate.pemInvalid", await _host.ErrorsAsync(Upload(new PemBundle("not a certificate", TestCertificates.AnotherKey()))));
    }

    [Fact]
    public async Task An_expired_certificate_is_refused()
    {
        var bundle = TestCertificates.SelfSigned(TestClock.Now.AddDays(-90), TestClock.Now.AddDays(-1), "shop.example.com");

        Assert.Contains("ChainPem: certificate.expired", await _host.ErrorsAsync(Upload(bundle)));
    }

    [Fact]
    public async Task A_certificate_that_isn_t_valid_yet_is_refused()
    {
        var bundle = TestCertificates.SelfSigned(TestClock.Now.AddDays(1), TestClock.Now.AddDays(90), "shop.example.com");

        Assert.Contains("ChainPem: certificate.notYetValid", await _host.ErrorsAsync(Upload(bundle)));
    }

    [Fact]
    public async Task A_certificate_without_hostnames_is_refused()
    {
        Assert.Contains("ChainPem: certificate.noHostnames", await _host.ErrorsAsync(Upload(TestCertificates.SelfSigned())));
    }

    [Fact]
    public async Task A_certificate_larger_than_64_KiB_is_refused()
    {
        var bundle = TestCertificates.SelfSigned("shop.example.com");

        Assert.Contains("ChainPem: certificate.tooLarge", await _host.ErrorsAsync(Upload(bundle with { ChainPem = bundle.ChainPem + new string(' ', CertificateUploadRules.MaximumPemLength) })));
    }

    [Fact]
    public async Task A_certificate_goes_into_an_existing_project()
    {
        var upload = Upload(TestCertificates.SelfSigned("shop.example.com")) with { ProjectId = Guid.NewGuid() };

        Assert.Contains("ProjectId: project.notFound", await _host.ErrorsAsync(upload));
    }

    [Fact]
    public async Task Replacing_a_certificate_keeps_its_id_and_records_the_replacement()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com")));
        var bundle = TestCertificates.SelfSigned("shop.example.com");

        var replaced = await _host.SendAsync(Upload(bundle) with { ReplacingId = id });

        Assert.Equal(id, replaced);
        Assert.Equal(CertificateEventKind.Replaced, _host.State.Certificates[id].History[0].Kind);
        Assert.Equal(bundle.KeyPem.Trim() + "\n", _host.State.Certificates[id].Material!.KeyPem);
    }

    [Fact]
    public async Task A_replacement_must_cover_the_routes_that_use_the_certificate()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com")));
        _host.Seed(new RouteSaved(ARoute(_project.Id, "shop.example.com") with { CertificateId = id }));

        Assert.Contains("ChainPem: certificate.routesNotCovered", await _host.ErrorsAsync(Upload(TestCertificates.SelfSigned("other.example.com")) with { ReplacingId = id }));
    }

    [Fact]
    public async Task An_automatic_certificate_can_t_be_replaced_by_an_upload()
    {
        var automatic = ACertificate("shop.example.com");
        _host.Seed(new CertificateSaved(automatic));

        Assert.Contains("ReplacingId: certificate.notUploaded", await _host.ErrorsAsync(Upload(TestCertificates.SelfSigned("shop.example.com")) with { ReplacingId = automatic.Id }));
    }

    [Fact]
    public async Task Checking_a_certificate_shows_what_it_covers_without_saving_it()
    {
        var bundle = TestCertificates.SelfSigned("shop.example.com", "*.shop.example.com");

        var preview = await _host.QueryAsync(new CheckCertificate(bundle.ChainPem, bundle.KeyPem));

        Assert.Equal(["shop.example.com", "*.shop.example.com"], preview.Hosts);
        Assert.Empty(_host.State.Certificates);
    }

    [Fact]
    public async Task A_certificate_in_use_can_t_be_deleted()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com")));
        _host.Seed(new RouteSaved(ARoute(_project.Id, "shop.example.com") with { CertificateId = id }));

        Assert.Equal(ErrorCodes.CertificateInUse, await _host.FailureAsync(new DeleteCertificate(id)));
    }

    [Fact]
    public async Task An_automatic_certificate_is_in_use_by_the_routes_for_its_host()
    {
        var automatic = ACertificate("shop.example.com");
        _host.Seed(new CertificateSaved(automatic), new RouteSaved(ARoute(_project.Id, "shop.example.com")));

        Assert.Equal(ErrorCodes.CertificateInUse, await _host.FailureAsync(new DeleteCertificate(automatic.Id)));
    }

    [Fact]
    public async Task An_unused_certificate_is_deleted()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com")));

        await _host.SendAsync(new DeleteCertificate(id));

        Assert.Empty(_host.State.Certificates);
    }

    [Fact]
    public async Task Deleting_a_certificate_that_doesn_t_exist_says_so()
    {
        Assert.Equal(ErrorCodes.CertificateNotFound, await _host.FailureAsync(new DeleteCertificate(Guid.NewGuid())));
    }

    [Fact]
    public async Task A_viewer_can_t_upload_a_certificate()
    {
        _host.SignedIn(Role.Viewer, "bea@example.com");

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com"))));
    }

    [Fact]
    public async Task An_uploaded_certificate_warns_30_days_before_it_expires()
    {
        var id = await _host.SendAsync(Upload(TestCertificates.SelfSigned("shop.example.com")));
        _host.Time.Advance(TimeSpan.FromDays(60));

        var details = await _host.QueryAsync(new GetCertificate(id));

        Assert.Equal(CertificateStatus.Expiring, details.Certificate.Status);
    }

    [Fact]
    public async Task Certificates_are_listed_soonest_to_expire_first()
    {
        var later = await _host.SendAsync(Upload(TestCertificates.SelfSigned(TestClock.Now.AddDays(-1), TestClock.Now.AddDays(200), "later.example.com")));
        var sooner = await _host.SendAsync(Upload(TestCertificates.SelfSigned("sooner.example.com")));

        var list = await _host.QueryAsync(new ListCertificates());

        Assert.Equal([sooner, later], list.Select(c => c.Id));
    }

    private UploadCertificate Upload(PemBundle bundle) => new(_project.Id, bundle.ChainPem, bundle.KeyPem);
}
