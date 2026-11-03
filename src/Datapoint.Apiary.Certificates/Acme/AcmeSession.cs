using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Certificates.Acme;

public sealed class AcmeSession(HttpClient http, AcmeDirectory directory, ECDsa key, Uri? accountUrl)
{
    private const string JoseJson = "application/jose+json";
    private const string ProblemPrefix = "urn:ietf:params:acme:error:";
    private string? _nonce;

    public AcmeDirectory Directory { get; } = directory;

    public static AcmeJwk Jwk(ECDsa key)
    {
        var parameters = key.ExportParameters(includePrivateParameters: false);
        return new AcmeJwk("P-256", "EC", Base64Url.Encode(parameters.Q.X), Base64Url.Encode(parameters.Q.Y));
    }

    public static string Thumbprint(ECDsa key) =>
        Base64Url.Encode(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(Jwk(key), AcmeJsonContext.Default.AcmeJwk)));

    public static AcmeException ProblemException(AcmeProblem? problem, string fallbackCode)
    {
        var type = problem?.Type ?? "";
        var code = type switch
        {
            ProblemPrefix + "rateLimited" => AcmeErrors.RateLimited,
            ProblemPrefix + "connection" or ProblemPrefix + "dns" or ProblemPrefix + "unauthorized"
                or ProblemPrefix + "incorrectResponse" or ProblemPrefix + "tls" or ProblemPrefix + "caa" => AcmeErrors.ChallengeFailed,
            _ => fallbackCode,
        };
        var details = new[] { problem?.Detail }.Concat(problem?.Subproblems?.Select(s => s.Detail) ?? [])
            .Where(d => !string.IsNullOrWhiteSpace(d));
        return new AcmeException(code, string.Join(" ", details));
    }

    public async Task<HttpResponseMessage> PostAsync<T>(Uri url, T payload, JsonTypeInfo<T> type, CancellationToken cancellationToken) =>
        await PostAsync(url, JsonSerializer.Serialize(payload, type), accept: null, cancellationToken);

    public async Task<T> FetchAsync<T>(Uri url, JsonTypeInfo<T> type, CancellationToken cancellationToken)
    {
        using var response = await PostAsync(url, "", accept: null, cancellationToken);
        return await ReadAsync(response, type, cancellationToken);
    }

    public async Task<string> FetchTextAsync(Uri url, string accept, CancellationToken cancellationToken)
    {
        using var response = await PostAsync(url, "", accept, cancellationToken);
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    public static async Task<T> ReadAsync<T>(HttpResponseMessage response, JsonTypeInfo<T> type, CancellationToken cancellationToken) =>
        await response.Content.ReadFromJsonAsync(type, cancellationToken)
        ?? throw new AcmeException(AcmeErrors.Rejected, "The ACME server sent an empty response.");

    private async Task<HttpResponseMessage> PostAsync(Uri url, string payload, string? accept, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            var response = await SendAsync(url, payload, accept, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return response;
            }

            using (response)
            {
                var problem = await ReadProblemAsync(response, cancellationToken);
                if (problem?.Type != ProblemPrefix + "badNonce" || attempt > 0)
                {
                    throw ProblemException(problem, AcmeErrors.Rejected);
                }
            }
        }
    }

    private async Task<HttpResponseMessage> SendAsync(Uri url, string payload, string? accept, CancellationToken cancellationToken)
    {
        var nonce = _nonce ?? await NewNonceAsync(cancellationToken);
        _nonce = null;
        var header = new AcmeProtectedHeader("ES256", nonce, url, accountUrl is null ? Jwk(key) : null, accountUrl);
        var encodedHeader = Base64Url.Encode(JsonSerializer.SerializeToUtf8Bytes(header, AcmeJsonContext.Default.AcmeProtectedHeader));
        var encodedPayload = Base64Url.Encode(Encoding.UTF8.GetBytes(payload));
        var signature = key.SignData(Encoding.ASCII.GetBytes(encodedHeader + "." + encodedPayload), HashAlgorithmName.SHA256);
        var body = new AcmeJws(encodedHeader, encodedPayload, Base64Url.Encode(signature));
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body, AcmeJsonContext.Default.AcmeJws), Encoding.UTF8, JoseJson),
        };
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(JoseJson);
        if (accept is not null)
        {
            request.Headers.Accept.ParseAdd(accept);
        }

        var response = await http.SendAsync(request, cancellationToken);
        Remember(response);
        return response;
    }

    private async Task<string> NewNonceAsync(CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Head, Directory.NewNonce);
        using var response = await http.SendAsync(request, cancellationToken);
        return response.Headers.TryGetValues("Replay-Nonce", out var values) && values.FirstOrDefault() is { } nonce
            ? nonce
            : throw new AcmeException(AcmeErrors.Unreachable, $"The ACME server gave no nonce ({(int)response.StatusCode}).");
    }

    private void Remember(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Replay-Nonce", out var values))
        {
            return;
        }

        _nonce = values.FirstOrDefault();
    }

    private static async Task<AcmeProblem?> ReadProblemAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            return await response.Content.ReadFromJsonAsync(AcmeJsonContext.Default.AcmeProblem, cancellationToken);
        }
        catch (JsonException)
        {
            return new AcmeProblem(null, $"The ACME server answered {(int)response.StatusCode} {response.StatusCode}.", null);
        }
        catch (HttpRequestException) when (response.StatusCode == HttpStatusCode.ServiceUnavailable)
        {
            return null;
        }
    }
}
