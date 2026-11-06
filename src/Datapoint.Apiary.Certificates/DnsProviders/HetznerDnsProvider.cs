using System.Text.Json.Nodes;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.DnsProviders;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class HetznerDnsProvider(DnsProviderHttp http, TimeProvider time) : IDnsProviderClient
{
    public const string Name = "Hetzner";
    public static readonly Uri BaseUri = new("https://api.hetzner.cloud/v1/");
    public static readonly TimeSpan ActionTimeout = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan ActionInterval = TimeSpan.FromSeconds(1);

    public DnsProviderKind Kind => DnsProviderKind.Hetzner;

    public Task AddAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        var body = new JsonObject { ["ttl"] = DnsMessages.RecordTtl, ["records"] = Records(value) };
        return ChangeAsync(provider, zone, name, "add_records", body, cancellationToken);
    }

    public async Task RemoveAsync(DnsProvider provider, string zone, string name, string value, CancellationToken cancellationToken)
    {
        try
        {
            await ChangeAsync(provider, zone, name, "remove_records", new JsonObject { ["records"] = Records(value) }, cancellationToken);
        }
        catch (DnsException exception) when (exception.Code == DnsErrors.ZoneNotFound)
        {
            return;
        }
    }

    private async Task ChangeAsync(DnsProvider provider, string zone, string name, string action, JsonObject body, CancellationToken cancellationToken)
    {
        var token = provider.Secrets[DnsProviderFields.Token];
        var path = $"zones/{Uri.EscapeDataString(zone)}/rrsets/{Uri.EscapeDataString(DnsProviderHttp.Relative(zone, name))}/TXT/actions/{action}";
        using var request = DnsProviderHttp.Request(HttpMethod.Post, new Uri(BaseUri, path), token, body);
        var response = await http.JsonAsync(request, Name, cancellationToken);
        await WaitAsync(token, response?["action"], cancellationToken);
    }

    private async Task WaitAsync(string token, JsonNode? action, CancellationToken cancellationToken)
    {
        var deadline = time.GetUtcNow() + ActionTimeout;
        while (Status(action) == "running" && time.GetUtcNow() < deadline)
        {
            await Task.Delay(ActionInterval, time, cancellationToken);
            using var request = DnsProviderHttp.Request(HttpMethod.Get, new Uri(BaseUri, $"actions/{action!["id"]}"), token);
            action = (await http.JsonAsync(request, Name, cancellationToken))?["action"];
        }

        if (Status(action) != "error")
        {
            return;
        }

        throw new DnsException(DnsErrors.Unreachable, $"{Name} couldn't change the record: {action!["error"]?["message"]}");
    }

    private static string? Status(JsonNode? action) => action?["status"]?.GetValue<string>();

    private static JsonArray Records(string value) => [new JsonObject { ["value"] = DnsProviderHttp.Quoted(value) }];
}
