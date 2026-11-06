using System.Collections.Concurrent;
using System.Net;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class AzureDnsProvider(DnsProviderHttp http, TimeProvider time) : IDnsProviderClient
{
    public const string Name = "Azure DNS";
    public const string ApiVersion = "2018-05-01";
    public static readonly Uri LoginUri = new("https://login.microsoftonline.com/");
    public static readonly Uri ManagementUri = new("https://management.azure.com/");
    private static readonly TimeSpan s_tokenMargin = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<string, (string Token, DateTimeOffset ExpiresAt)> _tokens = new(StringComparer.Ordinal);

    public DnsProviderKind Kind => DnsProviderKind.Azure;

    public async Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var token = await TokenAsync(provider, cancellationToken);
        var values = await ValuesAsync(provider, token, zone, name, cancellationToken);
        if (values.Contains(value, StringComparer.Ordinal))
        {
            return;
        }

        await PutAsync(provider, token, zone, name, [.. values, value], cancellationToken);
    }

    public async Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var token = await TokenAsync(provider, cancellationToken);
        var values = await ValuesAsync(provider, token, zone, name, cancellationToken);
        if (!values.Contains(value, StringComparer.Ordinal))
        {
            return;
        }

        var left = values.Where(v => v != value).ToList();
        if (left.Count > 0)
        {
            await PutAsync(provider, token, zone, name, left, cancellationToken);
            return;
        }

        using var request = DnsProviderHttp.Request(HttpMethod.Delete, RecordSet(provider, zone, name), token);
        await http.JsonAsync(request, Name, cancellationToken);
    }

    private async Task<List<string>> ValuesAsync(DnsProvider provider, string token, string zone, string name, CancellationToken cancellationToken)
    {
        using var request = DnsProviderHttp.Request(HttpMethod.Get, RecordSet(provider, zone, name), token);
        using var response = await http.SendAsync(request, Name, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound && !body.Contains("ParentResourceNotFound", StringComparison.Ordinal))
        {
            return [];
        }

        DnsProviderHttp.Check(response.StatusCode, Name, body);
        var records = JsonNode.Parse(body)?["properties"]?["TXTRecords"]?.AsArray() ?? [];
        return [.. records.Select(Joined)];
    }

    private static string Joined(JsonNode? record) =>
        string.Concat(record?["value"]?.AsArray().Select(v => v?.GetValue<string>()) ?? []);

    private async Task PutAsync(DnsProvider provider, string token, string zone, string name, List<string> values, CancellationToken cancellationToken)
    {
        var records = new JsonArray([.. values.Select(v => new JsonObject { ["value"] = new JsonArray(v) })]);
        var body = new JsonObject { ["properties"] = new JsonObject { ["TTL"] = DnsMessages.RecordTtl, ["TXTRecords"] = records } };
        using var request = DnsProviderHttp.Request(HttpMethod.Put, RecordSet(provider, zone, name), token, body);
        await http.JsonAsync(request, Name, cancellationToken);
    }

    private static Uri RecordSet(DnsProvider provider, string zone, string name)
    {
        var path = $"subscriptions/{Escape(provider, DnsProviderFields.Subscription)}/resourceGroups/{Escape(provider, DnsProviderFields.ResourceGroup)}"
            + $"/providers/Microsoft.Network/dnsZones/{Uri.EscapeDataString(zone)}/TXT/{Uri.EscapeDataString(DnsProviderHttp.Relative(zone, name))}?api-version={ApiVersion}";
        return new Uri(ManagementUri, path);
    }

    private static string Escape(DnsProvider provider, string setting) => Uri.EscapeDataString(provider.Settings[setting]);

    private async Task<string> TokenAsync(DnsProvider provider, CancellationToken cancellationToken)
    {
        var tenant = provider.Settings[DnsProviderFields.Tenant];
        var clientId = provider.Settings[DnsProviderFields.ClientId];
        var secret = provider.Secrets[DnsProviderFields.ClientSecret];
        var key = $"{tenant} {clientId} {secret.GetHashCode(StringComparison.Ordinal)}";
        if (_tokens.TryGetValue(key, out var cached) && cached.ExpiresAt > time.GetUtcNow())
        {
            return cached.Token;
        }

        var form = new FormUrlEncodedContent(new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = clientId,
            ["client_secret"] = secret,
            ["scope"] = "https://management.azure.com/.default",
        });
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(LoginUri, $"{Uri.EscapeDataString(tenant)}/oauth2/v2.0/token")) { Content = form };
        using var response = await http.SendAsync(request, Name, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var status = response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound ? HttpStatusCode.Unauthorized : response.StatusCode;
        DnsProviderHttp.Check(status, Name, body);
        var json = JsonNode.Parse(body);
        var token = json?["access_token"]?.GetValue<string>() ?? throw new DnsException(DnsErrors.Unauthorized, $"{Name} sent no access token.");
        var lifetime = TimeSpan.FromSeconds(json?["expires_in"]?.GetValue<int>() ?? 0);
        _tokens[key] = (token, time.GetUtcNow() + lifetime - s_tokenMargin);
        return token;
    }
}
