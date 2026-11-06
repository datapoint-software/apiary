using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Certificates.Dns;

namespace Datapoint.Apiary.Certificates.DnsProviders;

public sealed class DnsProviderHttp(HttpClient http)
{
    public const string JsonType = "application/json";

    public async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, string provider, CancellationToken cancellationToken)
    {
        try
        {
            return await http.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            throw new DnsException(DnsErrors.Unreachable, $"{provider} didn't answer: {exception.Message}", exception);
        }
        catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw new DnsException(DnsErrors.Unreachable, $"{provider} didn't answer in time.", exception);
        }
    }

    public async Task<JsonNode?> JsonAsync(HttpRequestMessage request, string provider, CancellationToken cancellationToken)
    {
        using var response = await SendAsync(request, provider, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        Check(response.StatusCode, provider, body);
        return body.Length == 0 ? null : JsonNode.Parse(body);
    }

    public static void Check(HttpStatusCode status, string provider, string body)
    {
        if (status is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            throw new DnsException(DnsErrors.Unauthorized, $"{provider} refused the credentials ({(int)status}): {Shorten(body)}");
        }

        if (status == HttpStatusCode.NotFound)
        {
            throw new DnsException(DnsErrors.ZoneNotFound, $"{provider} doesn't hold the zone ({(int)status}): {Shorten(body)}");
        }

        if ((int)status is >= 200 and < 300)
        {
            return;
        }

        throw new DnsException(DnsErrors.Unreachable, $"{provider} couldn't change the record ({(int)status}): {Shorten(body)}");
    }

    public static HttpRequestMessage Request(HttpMethod method, Uri uri, string? token, JsonNode? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        if (token is not null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        if (body is not null)
        {
            request.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, JsonType);
        }

        return request;
    }

    public static string Quoted(string value) => "\"" + value + "\"";

    public static string Unquoted(string value) => value.Length >= 2 && value[0] == '"' && value[^1] == '"' ? value[1..^1] : value;

    public static string Relative(string zone, string name) =>
        string.Equals(name, zone, StringComparison.OrdinalIgnoreCase) ? "@" : name[..^(zone.Length + 1)];

    private static string Shorten(string body) => body.Length <= 300 ? body : body[..300];
}
