using System.Net;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.DnsProviders;
using static Datapoint.Apiary.Certificates.Tests.DnsProviders.ProviderApis;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class CloudflareDnsProviderTests : IDisposable
{
    private const string Api = "api.cloudflare.com/client/v4/";
    private readonly FakeProviderApi _api = new();
    private readonly CloudflareDnsProvider _client;
    private readonly DnsProvider _provider = WithToken(DnsProviderKind.Cloudflare);

    public CloudflareDnsProviderTests()
    {
        _client = new CloudflareDnsProvider(_api.Http());
        _api.On("GET", Api + "zones", """{"result":[{"id":"z1","name":"example.com"}]}""");
    }

    public void Dispose() => _api.Dispose();

    [Fact]
    public async Task A_record_is_added_to_the_zone_with_its_id()
    {
        _api.On("POST", Api + "zones/z1/dns_records", """{"success":true}""");

        await _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal(["GET /client/v4/zones?name=example.com", "POST /client/v4/zones/z1/dns_records"], _api.Requests);
        AssertJson($$"""{"type":"TXT","name":"{{Name}}","content":"\"{{Value}}\"","ttl":60}""", _api.Bodies[1]);
    }

    [Fact]
    public async Task A_record_that_s_already_there_is_fine()
    {
        _api.On("POST", Api + "zones/z1/dns_records", """{"success":false,"errors":[{"code":81058,"message":"An identical record already exists."}]}""", HttpStatusCode.BadRequest);

        await _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal(2, _api.Requests.Count);
    }

    [Fact]
    public async Task A_zone_the_token_can_t_see_is_not_found()
    {
        using var api = new FakeProviderApi().On("GET", Api + "zones", """{"result":[]}""");

        var failure = await Assert.ThrowsAsync<DnsException>(() => new CloudflareDnsProvider(api.Http()).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.ZoneNotFound, failure.Code);
    }

    [Fact]
    public async Task Removing_deletes_only_the_record_with_that_value()
    {
        _api.On("GET", Api + "zones/z1/dns_records", $$"""{"result":[{"id":"r1","content":"\"other\""},{"id":"r2","content":"\"{{Value}}\""}]}""")
            .On("DELETE", Api + "zones/z1/dns_records/r2", """{"success":true}""");

        await _client.RemoveAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal("DELETE /client/v4/zones/z1/dns_records/r2", _api.Requests[^1]);
        Assert.Equal(3, _api.Requests.Count);
    }

    [Fact]
    public async Task A_refused_token_is_unauthorized()
    {
        using var api = new FakeProviderApi().On("GET", Api + "zones", """{"success":false}""", HttpStatusCode.Forbidden);

        var failure = await Assert.ThrowsAsync<DnsException>(() => new CloudflareDnsProvider(api.Http()).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unauthorized, failure.Code);
    }

    [Fact]
    public async Task A_provider_that_doesn_t_answer_is_unreachable()
    {
        _api.Failure = new HttpRequestException("Connection refused");

        var failure = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unreachable, failure.Code);
    }
}
