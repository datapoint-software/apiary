using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.Renewal;
using Datapoint.Apiary.Certificates.Tests.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.Renewal;

public sealed class CertificateIssuerDnsTests : IAsyncDisposable
{
    private const string Wildcard = "*.example.com";
    private const string RecordName = "_acme-challenge.example.com";
    private readonly FakeTimeProvider _time = TestClock.Fake();
    private readonly FakeClusterState _cluster = new();
    private readonly FakeDnsServer _dnsServer = new FakeDnsServer().Zone("example.com").Zone("acme.example.net");
    private readonly FakeAcme _acme;
    private readonly TestDns _dns;
    private readonly CertificateIssuer _issuer;
    private readonly DnsProvider _provider;

    public CertificateIssuerDnsTests()
    {
        _acme = new FakeAcme(_time);
        _dns = new TestDns(_dnsServer, _cluster, _time);
        _issuer = new CertificateIssuer(_cluster, _acme, _dns.Writer, _dns.Cleanup, Options.Create(new AcmeOptions()), _time, NullLogger<CertificateIssuer>.Instance);
        _provider = Rfc2136DnsProviderTests.OfficeServer(_dnsServer);
        Request(_provider);
    }

    public async ValueTask DisposeAsync()
    {
        _acme.Dispose();
        _cluster.Dispose();
        await _dnsServer.DisposeAsync();
    }

    [Fact]
    public async Task A_wildcard_is_proved_with_TXT_records_through_its_provider()
    {
        var result = await IssueAsync();

        Assert.True(result!.Succeeded);
        Assert.Equal(AcmeChallengeType.Dns01, _acme.LastChallenge);
        Assert.Equal([Wildcard, "example.com"], result.Certificate.Material!.Hosts);
    }

    [Fact]
    public async Task The_records_are_in_DNS_and_in_the_state_while_ACME_checks_them()
    {
        (int InState, int InDns) during = default;
        _acme.WhileCompleting = () =>
        {
            during = (_cluster.Current.DnsChallengeRecords.Count, _dnsServer.Text(RecordName).Count);
            return Task.CompletedTask;
        };

        await IssueAsync();

        Assert.Equal((2, 2), during);
        Assert.Empty(_cluster.Current.DnsChallengeRecords);
        Assert.Empty(_dnsServer.Text(RecordName));
    }

    [Fact]
    public async Task A_missing_CNAME_fails_before_anything_is_written()
    {
        Request(_provider with { ChallengeZone = "acme.example.net" });

        var result = await IssueAsync();

        Assert.Equal(DnsErrors.CnameMissing, result!.FailureCode);
        Assert.Empty(_dnsServer.Updates);
    }

    [Fact]
    public async Task A_record_that_never_shows_fails_without_asking_ACME_to_validate()
    {
        var completed = false;
        _acme.WhileCompleting = () =>
        {
            completed = true;
            return Task.CompletedTask;
        };
        _dnsServer.HidesUpdates = true;

        var result = await AdvanceUntilDoneAsync(IssueAsync);

        Assert.Equal(DnsErrors.NotPropagated, result!.FailureCode);
        Assert.False(completed);
    }

    [Fact]
    public async Task A_record_that_can_t_be_removed_stays_in_the_state_to_try_again()
    {
        _acme.WhileCompleting = () =>
        {
            _dnsServer.UpdateCode = DnsResponseCode.Refused;
            return Task.CompletedTask;
        };

        await IssueAsync();

        Assert.Equal(2, _cluster.Current.DnsChallengeRecords.Count);
    }

    [Fact]
    public async Task Records_of_a_removed_provider_are_forgotten()
    {
        var record = new DnsChallengeRecord(RecordName, "value", "example.com", AnId(), TestClock.Now);

        var removed = await _dns.Cleanup.RemoveAsync([record], TestContext.Current.CancellationToken);

        Assert.Equal([DnsChallengeRecord.KeyOf(RecordName, "value")], removed);
    }

    private void Request(DnsProvider provider)
    {
        var certificate = ACertificate(Wildcard) with { AlternativeNames = ["example.com"], DnsProviderId = provider.Id, Requested = true };
        _cluster.Current = Datapoint.Apiary.Cluster.State.ApiaryState.Empty.With(new DnsProviderSaved(provider), new CertificateRequested(certificate));
    }

    private Task<IssueResult?> IssueAsync() =>
        _issuer.IssueAsync(Wildcard, null, CertificateRenewal.IssueAction, TestContext.Current.CancellationToken);

    private async Task<IssueResult?> AdvanceUntilDoneAsync(Func<Task<IssueResult?>> issue)
    {
        var issuing = issue();
        while (!issuing.IsCompleted)
        {
            _time.Advance(DnsPropagation.Interval);
            await Task.Delay(10, TestContext.Current.CancellationToken);
        }

        return await issuing;
    }
}
