using System.Net;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Certificates.DnsProviders;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Cluster.DnsProviders;
using static Datapoint.Apiary.Certificates.Tests.DnsProviders.ProviderApis;

namespace Datapoint.Apiary.Certificates.Tests.DnsProviders;

public sealed class Route53DnsProviderTests
{
    private const string Api = "route53.amazonaws.com/2013-04-01/";
    private const string Xmlns = "https://route53.amazonaws.com/doc/2013-04-01/";
    private const string Zones = $"""
        <ListHostedZonesByNameResponse xmlns="{Xmlns}"><HostedZones>
        <HostedZone><Id>/hostedzone/ZPRIVATE</Id><Name>example.com.</Name><Config><PrivateZone>true</PrivateZone></Config></HostedZone>
        <HostedZone><Id>/hostedzone/ZPUBLIC</Id><Name>example.com.</Name><Config><PrivateZone>false</PrivateZone></Config></HostedZone>
        </HostedZones></ListHostedZonesByNameResponse>
        """;
    private const string Empty = $"""<ListResourceRecordSetsResponse xmlns="{Xmlns}"><ResourceRecordSets/></ListResourceRecordSetsResponse>""";
    private readonly DnsProvider _provider = Provider(
        DnsProviderKind.Route53,
        [(DnsProviderFields.AccessKey, "AKIDEXAMPLE")],
        [(DnsProviderFields.SecretKey, "secret-key")]);

    [Fact]
    public async Task A_record_is_upserted_in_the_public_hosted_zone()
    {
        using var api = Api53(Empty);

        await Client(api).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Equal("POST /2013-04-01/hostedzone/ZPUBLIC/rrset", api.Requests[^1]);
        Assert.Contains($"<Action>UPSERT</Action><ResourceRecordSet><Name>{Name}.</Name><Type>TXT</Type><TTL>60</TTL><ResourceRecords><ResourceRecord><Value>\"{Value}\"</Value>", api.Bodies[^1], StringComparison.Ordinal);
        Assert.StartsWith("AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/", api.Authorizations[^1], StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_value_is_added_beside_the_ones_already_there()
    {
        using var api = Api53(Existing("\"base-domain\""));

        await Client(api).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Contains($"<Value>\"base-domain\"</Value></ResourceRecord><ResourceRecord><Value>\"{Value}\"</Value>", api.Bodies[^1], StringComparison.Ordinal);
    }

    [Fact]
    public async Task Removing_the_last_value_deletes_the_record_set()
    {
        using var api = Api53(Existing($"\"{Value}\""));

        await Client(api).RemoveAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.Contains("<Action>DELETE</Action>", api.Bodies[^1], StringComparison.Ordinal);
        Assert.Contains("<TTL>120</TTL>", api.Bodies[^1], StringComparison.Ordinal);
    }

    [Fact]
    public async Task Removing_a_value_that_s_gone_changes_nothing()
    {
        using var api = Api53(Empty);

        await Client(api).RemoveAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken);

        Assert.DoesNotContain(api.Requests, r => r.StartsWith("POST", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Only_a_private_zone_is_not_found()
    {
        using var api = new FakeProviderApi().On("GET", Api + "hostedzonesbyname", Zones.Replace("ZPUBLIC</Id><Name>example.com.", "ZPUBLIC</Id><Name>example.org.", StringComparison.Ordinal));

        var failure = await Assert.ThrowsAsync<DnsException>(() => Client(api).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.ZoneNotFound, failure.Code);
    }

    [Fact]
    public async Task A_refused_signature_is_unauthorized()
    {
        using var api = new FakeProviderApi().On("GET", Api + "hostedzonesbyname", "<ErrorResponse><Error><Code>SignatureDoesNotMatch</Code></Error></ErrorResponse>", HttpStatusCode.Forbidden);

        var failure = await Assert.ThrowsAsync<DnsException>(() => Client(api).AddAsync(_provider, Zone, Name, Value, TestContext.Current.CancellationToken));

        Assert.Equal(DnsErrors.Unauthorized, failure.Code);
    }

    private static Route53DnsProvider Client(FakeProviderApi api) => new(api.Http(), TimeProvider.System);

    private static FakeProviderApi Api53(string recordSets) => new FakeProviderApi()
        .On("GET", Api + "hostedzonesbyname", Zones)
        .On("GET", Api + "hostedzone/ZPUBLIC/rrset", recordSets)
        .On("POST", Api + "hostedzone/ZPUBLIC/rrset", $"""<ChangeResourceRecordSetsResponse xmlns="{Xmlns}"/>""");

    private static string Existing(string value) => $"""
        <ListResourceRecordSetsResponse xmlns="{Xmlns}"><ResourceRecordSets><ResourceRecordSet>
        <Name>{Name}.</Name><Type>TXT</Type><TTL>120</TTL><ResourceRecords><ResourceRecord><Value>{value}</Value></ResourceRecord></ResourceRecords>
        </ResourceRecordSet></ResourceRecordSets></ListResourceRecordSetsResponse>
        """;
}
