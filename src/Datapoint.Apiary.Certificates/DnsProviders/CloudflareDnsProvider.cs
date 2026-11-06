using System.Text.Json.Nodes;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class CloudflareDnsProvider(DnsProviderHttp http) : IDnsProviderClient
{
    public const string Name = "Cloudflare";
    public const int IdenticalRecordExists = 81058;
    public static readonly Uri BaseUri = new("https://api.cloudflare.com/client/v4/");

    public DnsProviderKind Kind => DnsProviderKind.Cloudflare;

    public async Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var token = provider.Secrets[DnsProviderFields.Token];
        var zoneId = await ZoneIdAsync(token, zone, cancellationToken);
        var body = new JsonObject { ["type"] = "TXT", ["name"] = name, ["content"] = DnsProviderHttp.Quoted(value), ["ttl"] = DnsMessages.RecordTtl };
        using var request = DnsProviderHttp.Request(HttpMethod.Post, new Uri(BaseUri, $"zones/{zoneId}/dns_records"), token, body);
        using var response = await http.SendAsync(request, Name, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        if (HasError(text, IdenticalRecordExists))
        {
            return;
        }

        DnsProviderHttp.Check(response.StatusCode, Name, text);
    }

    public async Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var token = provider.Secrets[DnsProviderFields.Token];
        var zoneId = await ZoneIdAsync(token, zone, cancellationToken);
        var query = $"zones/{zoneId}/dns_records?type=TXT&name={Uri.EscapeDataString(name)}&per_page=100";
        using var list = DnsProviderHttp.Request(HttpMethod.Get, new Uri(BaseUri, query), token);
        var records = (await http.JsonAsync(list, Name, cancellationToken))?["result"]?.AsArray() ?? [];
        foreach (var id in records.Where(r => Content(r) == value).Select(r => r!["id"]!.GetValue<string>()))
        {
            using var delete = DnsProviderHttp.Request(HttpMethod.Delete, new Uri(BaseUri, $"zones/{zoneId}/dns_records/{id}"), token);
            await http.JsonAsync(delete, Name, cancellationToken);
        }
    }

    private async Task<string> ZoneIdAsync(string token, string zone, CancellationToken cancellationToken)
    {
        using var request = DnsProviderHttp.Request(HttpMethod.Get, new Uri(BaseUri, $"zones?name={Uri.EscapeDataString(zone)}"), token);
        var zones = (await http.JsonAsync(request, Name, cancellationToken))?["result"]?.AsArray();
        return zones?.FirstOrDefault()?["id"]?.GetValue<string>()
            ?? throw new DnsException(DnsErrors.ZoneNotFound, $"{Name} has no zone {zone} for this token.");
    }

    private static string? Content(JsonNode? record) =>
        record?["content"]?.GetValue<string>() is { } content ? DnsProviderHttp.Unquoted(content) : null;

    private static bool HasError(string body, int code)
    {
        if (!body.StartsWith('{'))
        {
            return false;
        }

        var errors = JsonNode.Parse(body)?["errors"]?.AsArray() ?? [];
        return errors.Any(e => e?["code"]?.GetValue<int>() == code);
    }
}
