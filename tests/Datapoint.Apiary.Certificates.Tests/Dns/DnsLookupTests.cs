using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Certificates.Tests.Dns;

public sealed class DnsLookupTests : IAsyncDisposable
{
    private readonly FakeDnsServer _dns = new FakeDnsServer().Zone("example.com");
    private readonly DnsLookup _lookup;

    public DnsLookupTests() => _lookup = Lookup(_dns);

    public static DnsLookup Lookup(FakeDnsServer dns) =>
        new(new DnsClient(TimeProvider.System), Options.Create(new DnsOptions { Resolvers = dns.Address, ServerPort = dns.Port }));

    public ValueTask DisposeAsync() => _dns.DisposeAsync();

    [Fact]
    public async Task Finds_the_zone_of_a_name_that_doesn_t_exist_yet()
    {
        Assert.Equal("example.com", await _lookup.ZoneOfAsync("_acme-challenge.shop.example.com", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_name_outside_every_zone_has_none()
    {
        var exception = await Assert.ThrowsAsync<DnsException>(() => _lookup.ZoneOfAsync("shop.example.net", TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.ZoneNotFound, exception.Code);
    }

    [Fact]
    public async Task Finds_the_addresses_of_a_zone_s_name_servers()
    {
        var servers = await _lookup.NameServersAsync("example.com", TestContext.Current.CancellationToken);

        Assert.Equal([_dns.Endpoint], servers);
    }

    [Fact]
    public async Task Reads_a_canonical_name()
    {
        _dns.Record("_acme-challenge.shop.example.com", DnsRecordType.CName, "shop.example.com.acme.example.net");

        Assert.Equal("shop.example.com.acme.example.net", await _lookup.CanonicalNameAsync("_acme-challenge.shop.example.com", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Asks_again_over_TCP_when_the_UDP_answer_is_truncated()
    {
        _dns.Record("_acme-challenge.shop.example.com", DnsRecordType.Txt, "value");
        _dns.TruncateUdp = true;

        Assert.Equal(["value"], await _lookup.TextAsync(_dns.Endpoint, "_acme-challenge.shop.example.com", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_resolver_that_doesn_t_answer_is_unreachable()
    {
        var lookup = new DnsLookup(new DnsClient(TimeProvider.System), Options.Create(new DnsOptions { Resolvers = $"127.0.0.1:{FreePorts.Next()}" }));

        var exception = await Assert.ThrowsAsync<DnsException>(() => lookup.ZoneOfAsync("example.com", TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unreachable, exception.Code);
    }
}
