using System.Net.Http.Headers;
using System.Xml.Linq;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class Route53DnsProvider(DnsProviderHttp http, TimeProvider time) : IDnsProviderClient
{
    public const string Name = "Route 53";
    public const string Region = "us-east-1";
    public const string Service = "route53";
    public static readonly Uri BaseUri = new("https://route53.amazonaws.com/2013-04-01/");
    public static readonly XNamespace Xmlns = "https://route53.amazonaws.com/doc/2013-04-01/";

    public DnsProviderKind Kind => DnsProviderKind.Route53;

    public async Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var zoneId = await ZoneIdAsync(provider, zone, cancellationToken);
        var (ttl, values) = await RecordSetAsync(provider, zoneId, name, cancellationToken);
        var quoted = DnsProviderHttp.Quoted(value);
        if (values.Contains(quoted, StringComparer.Ordinal))
        {
            return;
        }

        await ChangeAsync(provider, zoneId, "UPSERT", name, ttl ?? DnsMessages.RecordTtl, [.. values, quoted], cancellationToken);
    }

    public async Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var zoneId = await ZoneIdAsync(provider, zone, cancellationToken);
        var (ttl, values) = await RecordSetAsync(provider, zoneId, name, cancellationToken);
        var quoted = DnsProviderHttp.Quoted(value);
        if (ttl is null || !values.Contains(quoted, StringComparer.Ordinal))
        {
            return;
        }

        var left = values.Where(v => v != quoted).ToList();
        var (action, records) = left.Count == 0 ? ("DELETE", values) : ("UPSERT", left);
        await ChangeAsync(provider, zoneId, action, name, ttl.Value, records, cancellationToken);
    }

    private async Task<string> ZoneIdAsync(DnsProvider provider, string zone, CancellationToken cancellationToken)
    {
        var xml = await SendAsync(provider, HttpMethod.Get, $"hostedzonesbyname?dnsname={Uri.EscapeDataString(zone)}&maxitems=10", null, cancellationToken);
        var hostedZone = xml.Descendants(Xmlns + "HostedZone").FirstOrDefault(z =>
            string.Equals((string?)z.Element(Xmlns + "Name"), zone + ".", StringComparison.OrdinalIgnoreCase)
            && !string.Equals((string?)z.Element(Xmlns + "Config")?.Element(Xmlns + "PrivateZone"), "true", StringComparison.OrdinalIgnoreCase));
        var id = (string?)hostedZone?.Element(Xmlns + "Id") ?? throw new DnsException(DnsErrors.ZoneNotFound, $"{Name} has no public hosted zone {zone}.");
        return id.Replace("/hostedzone/", "", StringComparison.Ordinal);
    }

    private async Task<(uint? Ttl, List<string> Values)> RecordSetAsync(DnsProvider provider, string zoneId, string name, CancellationToken cancellationToken)
    {
        var xml = await SendAsync(provider, HttpMethod.Get, $"hostedzone/{zoneId}/rrset?name={Uri.EscapeDataString(name)}&type=TXT&maxitems=1", null, cancellationToken);
        var set = xml.Descendants(Xmlns + "ResourceRecordSet").FirstOrDefault(s =>
            string.Equals((string?)s.Element(Xmlns + "Name"), name + ".", StringComparison.OrdinalIgnoreCase)
            && (string?)s.Element(Xmlns + "Type") == "TXT");
        if (set is null)
        {
            return (null, []);
        }

        return ((uint?)set.Element(Xmlns + "TTL"), [.. set.Descendants(Xmlns + "Value").Select(v => v.Value)]);
    }

    private Task<XDocument> ChangeAsync(DnsProvider provider, string zoneId, string action, string name, uint ttl, List<string> values, CancellationToken cancellationToken)
    {
        var body = new XDocument(new XElement(Xmlns + "ChangeResourceRecordSetsRequest",
            new XElement(Xmlns + "ChangeBatch",
                new XElement(Xmlns + "Changes",
                    new XElement(Xmlns + "Change",
                        new XElement(Xmlns + "Action", action),
                        new XElement(Xmlns + "ResourceRecordSet",
                            new XElement(Xmlns + "Name", name + "."),
                            new XElement(Xmlns + "Type", "TXT"),
                            new XElement(Xmlns + "TTL", ttl),
                            new XElement(Xmlns + "ResourceRecords", values.Select(v => new XElement(Xmlns + "ResourceRecord", new XElement(Xmlns + "Value", v))))))))));
        return SendAsync(provider, HttpMethod.Post, $"hostedzone/{zoneId}/rrset", body, cancellationToken);
    }

    private async Task<XDocument> SendAsync(DnsProvider provider, HttpMethod method, string path, XDocument? body, CancellationToken cancellationToken)
    {
        var payload = body is null ? [] : System.Text.Encoding.UTF8.GetBytes(body.ToString(SaveOptions.DisableFormatting));
        using var request = new HttpRequestMessage(method, new Uri(BaseUri, path));
        if (body is not null)
        {
            request.Content = new ByteArrayContent(payload);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/xml");
        }

        AwsSignature.Sign(request, payload, provider.Settings[DnsProviderFields.AccessKey], provider.Secrets[DnsProviderFields.SecretKey], Region, Service, time.GetUtcNow());
        using var response = await http.SendAsync(request, Name, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        DnsProviderHttp.Check(response.StatusCode, Name, text);
        return text.Length == 0 ? new XDocument() : XDocument.Parse(text);
    }
}
