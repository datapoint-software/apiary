using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Dns;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class DnsChallengeWriterTests : IAsyncDisposable
{
    private readonly FakeDnsServer _dns = new FakeDnsServer().Zone("example.com").Zone("acme.example.net");
    private readonly DnsChallengeWriter _writer;

    public DnsChallengeWriterTests()
    {
        var lookup = DnsLookupTests.Lookup(_dns);
        var client = new Rfc2136DnsProvider(new DnsClient(TimeProvider.System), lookup, TimeProvider.System);
        _writer = new DnsChallengeWriter([client], lookup, new DnsPropagation(lookup, TimeProvider.System), TimeProvider.System);
    }

    public ValueTask DisposeAsync() => _dns.DisposeAsync();

    [Fact]
    public void A_wildcard_is_proved_at_its_base_name_in_the_narrowest_domain()
    {
        var provider = ADnsProvider() with { Domains = ["example.com", "corp.example.com"] };

        Assert.Equal(new DnsChallengeTarget("_acme-challenge.corp.example.com", "corp.example.com", null), DnsChallengeWriter.Target(provider, "*.corp.example.com"));
    }

    [Fact]
    public void A_separate_challenge_zone_holds_a_record_named_after_the_hostname()
    {
        var provider = ADnsProvider() with { ChallengeZone = "acme.example.net" };

        Assert.Equal(
            new DnsChallengeTarget("shop.example.com.acme.example.net", "acme.example.net", "_acme-challenge.shop.example.com"),
            DnsChallengeWriter.Target(provider, "shop.example.com"));
    }

    [Fact]
    public async Task A_missing_CNAME_is_found_before_anything_is_written()
    {
        var target = DnsChallengeWriter.Target(ADnsProvider() with { ChallengeZone = "acme.example.net" }, "shop.example.com");

        var exception = await Assert.ThrowsAsync<DnsException>(() => _writer.CheckDelegationAsync(target, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.CnameMissing, exception.Code);
    }

    [Fact]
    public async Task A_CNAME_to_the_challenge_zone_is_accepted()
    {
        _dns.Record("_acme-challenge.shop.example.com", DnsRecordType.CName, "shop.example.com.acme.example.net");
        var target = DnsChallengeWriter.Target(ADnsProvider() with { ChallengeZone = "acme.example.net" }, "shop.example.com");

        await _writer.CheckDelegationAsync(target, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task A_test_writes_and_removes_a_record()
    {
        var provider = Rfc2136DnsProviderTests.OfficeServer(_dns);

        var test = await _writer.TestAsync(provider, TestContext.Current.CancellationToken);

        Assert.True(test.Succeeded);
        Assert.Equal(2, _dns.Updates.Count(u => u.Contains("_apiary-test.example.com", StringComparison.Ordinal)));
        Assert.Empty(_dns.Text("_apiary-test.example.com"));
    }

    [Fact]
    public async Task A_failed_test_says_why()
    {
        var provider = Rfc2136DnsProviderTests.OfficeServer(_dns);
        _dns.Key = Rfc2136DnsProviderTests.KeyOf(provider) with { Secret = new byte[32] };

        var test = await _writer.TestAsync(provider, TestContext.Current.CancellationToken);

        Assert.Equal(DnsErrors.Unauthorized, test.Code);
    }
}
