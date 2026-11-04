using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Cluster.Tests.Certificates;

public sealed class CertificateChangesTests
{
    [Fact]
    public void Saving_a_certificate_adds_it()
    {
        var certificate = ACertificate();

        var state = ApiaryState.Empty.With(new CertificateSaved(certificate));

        Assert.Same(certificate, state.Certificates[certificate.Id]);
    }

    [Fact]
    public void Deleting_a_certificate_removes_it()
    {
        var certificate = ACertificate();

        var state = ApiaryState.Empty.With(new CertificateSaved(certificate), new CertificateDeleted(certificate.Id));

        Assert.Empty(state.Certificates);
    }

    [Fact]
    public void A_new_event_comes_first_in_the_history()
    {
        var certificate = ACertificate().WithEvent(AnEvent(CertificateEventKind.Issued));

        var renewed = certificate.WithEvent(AnEvent(CertificateEventKind.Renewed));

        Assert.Equal([CertificateEventKind.Renewed, CertificateEventKind.Issued], renewed.History.Select(e => e.Kind));
    }

    [Fact]
    public void The_history_keeps_the_latest_50_events()
    {
        var certificate = ACertificate() with { History = [.. Enumerable.Repeat(AnEvent(CertificateEventKind.Issued), Certificate.HistoryLimit)] };

        var renewed = certificate.WithEvent(AnEvent(CertificateEventKind.Renewed));

        Assert.Equal(Certificate.HistoryLimit, renewed.History.Count);
    }

    [Fact]
    public void A_full_history_drops_its_oldest_event()
    {
        var oldest = AnEvent(CertificateEventKind.Uploaded);
        var certificate = ACertificate() with { History = [.. Enumerable.Repeat(AnEvent(CertificateEventKind.Issued), Certificate.HistoryLimit - 1), oldest] };

        var renewed = certificate.WithEvent(AnEvent(CertificateEventKind.Renewed));

        Assert.DoesNotContain(oldest, renewed.History);
    }

    [Fact]
    public void Saving_the_admin_certificate_replaces_it()
    {
        var certificate = new AdminCertificate(SomeMaterial("apiary.example.com"), SelfSigned: false, TestClock.Now, "ana@example.com");

        var state = ApiaryState.Empty.With(new AdminCertificateSaved(certificate));

        Assert.Same(certificate, state.AdminCertificate);
    }

    [Fact]
    public void The_admin_certificate_s_fingerprint_separates_bytes_with_colons() =>
        Assert.Equal("A1:B2:C3:D4", new AdminCertificate(SomeMaterial("apiary.example.com"), SelfSigned: true, TestClock.Now, null).Fingerprint);
}
