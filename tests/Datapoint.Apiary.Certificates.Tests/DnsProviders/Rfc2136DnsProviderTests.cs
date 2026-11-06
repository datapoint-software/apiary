using System.Globalization;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Dns;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.DnsProviders;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class Rfc2136DnsProviderTests : IAsyncDisposable
{
    private const string Name = "_acme-challenge.shop.example.com";
    private readonly FakeDnsServer _dns = new FakeDnsServer().Zone("example.com");
    private readonly Rfc2136DnsProvider _client;
    private readonly DnsProvider _provider;

    public Rfc2136DnsProviderTests()
    {
        _provider = OfficeServer(_dns);
        _dns.Key = KeyOf(_provider);
        _client = new Rfc2136DnsProvider(new DnsClient(TimeProvider.System), DnsLookupTests.Lookup(_dns), TimeProvider.System);
    }

    public static DnsProvider OfficeServer(FakeDnsServer dns) =>
        ADnsProvider() with
        {
            Settings = new Dictionary<string, string>(ADnsProvider().Settings, StringComparer.Ordinal)
            {
                [DnsProviderFields.Server] = "127.0.0.1",
                [DnsProviderFields.Port] = dns.Port.ToString(CultureInfo.InvariantCulture),
            },
        };

    public static DnsTsigKey KeyOf(DnsProvider provider) =>
        new(provider.Settings[DnsProviderFields.KeyName], provider.Settings[DnsProviderFields.Algorithm], Convert.FromBase64String(provider.Secrets[DnsProviderFields.Secret]));

    public ValueTask DisposeAsync() => _dns.DisposeAsync();

    [Fact]
    public async Task Adds_a_TXT_record_with_a_signed_update()
    {
        await _client.AddAsync(_provider, "example.com", Name, "value", TestContext.Current.CancellationToken);

        Assert.Equal(["value"], _dns.Text(Name));
    }

    [Fact]
    public async Task Removes_only_the_value_it_added()
    {
        _dns.Record(Name, DnsRecordType.Txt, "other");
        await _client.AddAsync(_provider, "example.com", Name, "value", TestContext.Current.CancellationToken);

        await _client.RemoveAsync(_provider, "example.com", Name, "value", TestContext.Current.CancellationToken);

        Assert.Equal(["other"], _dns.Text(Name));
    }

    [Fact]
    public async Task A_wrong_key_is_unauthorized()
    {
        _dns.Key = KeyOf(_provider) with { Secret = new byte[32] };

        var exception = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, "example.com", Name, "value", TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unauthorized, exception.Code);
    }

    [Fact]
    public async Task A_zone_the_server_doesn_t_hold_isn_t_found()
    {
        var exception = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, "example.org", "_acme-challenge.example.org", "value", TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.ZoneNotFound, exception.Code);
    }

    [Fact]
    public async Task A_server_that_fails_is_retried_later()
    {
        _dns.UpdateCode = DnsResponseCode.ServerFailure;

        var exception = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, "example.com", Name, "value", TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unreachable, exception.Code);
    }
}
