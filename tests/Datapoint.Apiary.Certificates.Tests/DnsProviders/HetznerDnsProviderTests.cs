using System.Net;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.DnsProviders;
using static Datapoint.Apiary.Certificates.Tests.DnsProviders.ProviderApis;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class HetznerDnsProviderTests : IDisposable
{
    private const string Records = "api.hetzner.cloud/v1/zones/example.com/rrsets/_acme-challenge.shop/TXT/actions/";
    private const string Done = """{"action":{"id":7,"status":"success"}}""";
    private readonly FakeProviderApi _api = new();
    private readonly HetznerDnsProvider _client;
    private readonly DnsProvider _provider = WithToken(DnsProviderKind.Hetzner);

    public HetznerDnsProviderTests() => _client = new HetznerDnsProvider(_api.Http(), TimeProvider.System);

    public void Dispose() => _api.Dispose();

    [Fact]
    public async Task A_record_is_added_quoted_under_its_name_in_the_zone()
    {
        _api.On("POST", Records + "add_records", Done, HttpStatusCode.Created);

        await _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal("POST /v1/zones/example.com/rrsets/_acme-challenge.shop/TXT/actions/add_records", _api.Requests.Single());
        AssertJson($$"""{"ttl":60,"records":[{"value":"\"{{Value}}\""}]}""", _api.Bodies.Single());
        Assert.Equal("Bearer api-token", _api.Authorizations.Single());
    }

    [Fact]
    public async Task A_running_change_is_waited_for()
    {
        _api.On("POST", Records + "add_records", """{"action":{"id":7,"status":"running"}}""", HttpStatusCode.Created)
            .On("GET", "api.hetzner.cloud/v1/actions/7", Done);

        await _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal("GET /v1/actions/7", _api.Requests[^1]);
    }

    [Fact]
    public async Task A_change_that_fails_is_reported()
    {
        _api.On("POST", Records + "add_records", """{"action":{"id":7,"status":"error","error":{"message":"zone is secondary"}}}""", HttpStatusCode.Created);

        var failure = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unreachable, failure.Code);
        Assert.Contains("zone is secondary", failure.Detail, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_refused_token_is_unauthorized()
    {
        _api.On("POST", Records + "add_records", """{"error":{"code":"unauthorized"}}""", HttpStatusCode.Unauthorized);

        var failure = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unauthorized, failure.Code);
    }

    [Fact]
    public async Task A_zone_it_doesn_t_hold_is_not_found()
    {
        var failure = await Assert.ThrowsAsync<DnsException>(() => _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.ZoneNotFound, failure.Code);
    }

    [Fact]
    public async Task Removing_a_record_that_s_gone_succeeds()
    {
        await _client.RemoveAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal("POST /v1/zones/example.com/rrsets/_acme-challenge.shop/TXT/actions/remove_records", _api.Requests.Single());
    }

    [Fact]
    public async Task A_name_at_the_zone_apex_is_written_as_at()
    {
        _api.On("POST", "api.hetzner.cloud/v1/zones/example.com/rrsets/@/TXT/actions/add_records", Done, HttpStatusCode.Created);

        await _client.AddAsync(_provider, Zone, Zone, Value, TestContext.Current.CancellationToken);

        Assert.Equal("POST /v1/zones/example.com/rrsets/@/TXT/actions/add_records", _api.Requests.Single());
    }
}
