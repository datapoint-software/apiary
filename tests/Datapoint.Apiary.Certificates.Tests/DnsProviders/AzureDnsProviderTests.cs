using System.Net;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.DnsProviders;
using static Datapoint.Apiary.Certificates.Tests.DnsProviders.ProviderApis;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class AzureDnsProviderTests : IDisposable
{
    private const string Login = "login.microsoftonline.com/tenant-1/oauth2/v2.0/token";
    private const string RecordSet = "management.azure.com/subscriptions/sub-1/resourceGroups/dns/providers/Microsoft.Network/dnsZones/example.com/TXT/_acme-challenge.shop";
    private const string Path = "/subscriptions/sub-1/resourceGroups/dns/providers/Microsoft.Network/dnsZones/example.com/TXT/_acme-challenge.shop?api-version=2018-05-01";
    private readonly FakeProviderApi _api = new();
    private readonly AzureDnsProvider _client;
    private readonly DnsProvider _provider = Provider(
        DnsProviderKind.Azure,
        [(DnsProviderFields.Tenant, "tenant-1"), (DnsProviderFields.ClientId, "client-1"), (DnsProviderFields.Subscription, "sub-1"), (DnsProviderFields.ResourceGroup, "dns")],
        [(DnsProviderFields.ClientSecret, "client-secret")]);

    public AzureDnsProviderTests()
    {
        _client = new AzureDnsProvider(_api.Http(), TimeProvider.System);
        _api.On("POST", Login, """{"access_token":"azure-token","expires_in":3600}""")
            .On("GET", RecordSet, """{"error":{"code":"NotFound"}}""", HttpStatusCode.NotFound)
            .On("PUT", RecordSet, "{}")
            .On("DELETE", RecordSet, "");
    }

    public void Dispose() => _api.Dispose();

    [Fact]
    public async Task A_record_set_is_created_with_the_value()
    {
        await _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal(["POST /tenant-1/oauth2/v2.0/token", "GET " + Path, "PUT " + Path], _api.Requests);
        AssertJson($$$"""{"properties":{"TTL":60,"TXTRecords":[{"value":["{{{Value}}}"]}]}}""", _api.Bodies[2]);
        Assert.Equal("Bearer azure-token", _api.Authorizations[2]);
    }

    [Fact]
    public async Task The_token_is_kept_until_it_expires()
    {
        await _client.AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        await _client.AddAsync(_provider, Zone, Name, "second", TestContext.Current.CancellationToken);

        Assert.Single(_api.Requests, r => r.Contains("oauth2", StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_value_is_added_beside_the_ones_already_there()
    {
        using var api = WithExisting("""{"properties":{"TXTRecords":[{"value":["base-domain"]}]}}""");

        await new AzureDnsProvider(api.Http(), TimeProvider.System).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        AssertJson($$$"""{"properties":{"TTL":60,"TXTRecords":[{"value":["base-domain"]},{"value":["{{{Value}}}"]}]}}""", api.Bodies[^1]);
    }

    [Fact]
    public async Task Removing_the_last_value_deletes_the_record_set()
    {
        using var api = WithExisting($$$"""{"properties":{"TXTRecords":[{"value":["{{{Value}}}"]}]}}""");

        await new AzureDnsProvider(api.Http(), TimeProvider.System).RemoveAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal("DELETE " + Path, api.Requests[^1]);
    }

    [Fact]
    public async Task Removing_one_of_two_values_keeps_the_other()
    {
        using var api = WithExisting($$$"""{"properties":{"TXTRecords":[{"value":["base-domain"]},{"value":["{{{Value}}}"]}]}}""");

        await new AzureDnsProvider(api.Http(), TimeProvider.System).RemoveAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        AssertJson("""{"properties":{"TTL":60,"TXTRecords":[{"value":["base-domain"]}]}}""", api.Bodies[^1]);
    }

    [Fact]
    public async Task A_wrong_client_secret_is_unauthorized()
    {
        using var api = new FakeProviderApi().On("POST", Login, """{"error":"invalid_client"}""", HttpStatusCode.BadRequest);

        var failure = await Assert.ThrowsAsync<DnsException>(() => new AzureDnsProvider(api.Http(), TimeProvider.System).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unauthorized, failure.Code);
    }

    [Fact]
    public async Task A_zone_that_isn_t_in_the_resource_group_is_not_found()
    {
        using var api = new FakeProviderApi()
            .On("POST", Login, """{"access_token":"azure-token","expires_in":3600}""")
            .On("GET", RecordSet, """{"error":{"code":"ParentResourceNotFound"}}""", HttpStatusCode.NotFound);

        var failure = await Assert.ThrowsAsync<DnsException>(() => new AzureDnsProvider(api.Http(), TimeProvider.System).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.ZoneNotFound, failure.Code);
    }

    private static FakeProviderApi WithExisting(string recordSet) => new FakeProviderApi()
        .On("POST", Login, """{"access_token":"azure-token","expires_in":3600}""")
        .On("GET", RecordSet, recordSet)
        .On("PUT", RecordSet, "{}")
        .On("DELETE", RecordSet, "");
}
