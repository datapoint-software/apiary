using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Datapoint.Apiary.Tests.SingleSignOn;

internal sealed class FakeIdentityProvider(string issuer = "https://id.example.com") : HttpMessageHandler
{
    public const string ClientSecretBasic = "client_secret_basic";
    public const string ClientSecretPost = "client_secret_post";

    private readonly ConcurrentDictionary<string, FakeAuthorization> _codes = new(StringComparer.Ordinal);
    private RSA _rsa = RSA.Create(2048);
    private ECDsa _ec = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    private string _keyId = Guid.NewGuid().ToString("N");

    public string Issuer { get; } = issuer;

    public string DiscoveredIssuer { get; set; } = issuer;

    public string ClientId { get; init; } = "apiary";

    public string ClientSecret { get; init; } = "client-secret";

    public IReadOnlyList<string> AdvertisedAuthMethods { get; set; } = [ClientSecretBasic, ClientSecretPost];

    public IReadOnlyList<string> AcceptedAuthMethods { get; set; } = [ClientSecretBasic, ClientSecretPost];

    public string Algorithm { get; set; } = SecurityAlgorithms.RsaSha256;

    public FakeSigning Signing { get; set; } = FakeSigning.PublishedKey;

    public bool SendsIssuerOnCallback { get; set; }

    public IReadOnlyList<string> UsedAuthMethods => [.. _used];

    private readonly ConcurrentQueue<string> _used = new();

    private string Base => Issuer.TrimEnd('/');

    public void RotateKeys()
    {
        _rsa = RSA.Create(2048);
        _ec = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        _keyId = Guid.NewGuid().ToString("N");
    }

    public Uri Authorize(Uri request, IReadOnlyDictionary<string, object?> claims)
    {
        var query = QueryHelpers.ParseQuery(request.Query);
        Assert.Equal(Base + "/authorize", request.GetLeftPart(UriPartial.Path));
        Assert.Equal("code", query["response_type"].ToString());
        Assert.Equal(ClientId, query["client_id"].ToString());
        Assert.Contains("openid", query["scope"].ToString().Split(' '));
        Assert.Equal("S256", query["code_challenge_method"].ToString());
        Assert.NotEmpty(query["state"].ToString());
        Assert.NotEmpty(query["nonce"].ToString());
        var code = Guid.NewGuid().ToString("N");
        _codes[code] = new FakeAuthorization(query["redirect_uri"].ToString(), query["nonce"].ToString(), query["code_challenge"].ToString(), claims);
        return Callback(query["redirect_uri"].ToString(), ("code", code), ("state", query["state"].ToString()));
    }

    public Uri Deny(Uri request, string error)
    {
        var query = QueryHelpers.ParseQuery(request.Query);
        return Callback(query["redirect_uri"].ToString(), ("error", error), ("error_description", "The user\r\ncancelled."), ("state", query["state"].ToString()));
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri!.GetLeftPart(UriPartial.Path);
        return path switch
        {
            _ when path == Base + "/.well-known/openid-configuration" => Json(HttpStatusCode.OK, Discovery()),
            _ when path == Base + "/keys" => Json(HttpStatusCode.OK, Keys()),
            _ when path == Base + "/token" && request.Method == HttpMethod.Post => await TokenAsync(request, cancellationToken),
            _ => new HttpResponseMessage(HttpStatusCode.NotFound),
        };
    }

    private Uri Callback(string redirectUri, params (string Name, string Value)[] parameters)
    {
        var all = SendsIssuerOnCallback ? [.. parameters, ("iss", DiscoveredIssuer)] : parameters;
        return new Uri(QueryHelpers.AddQueryString(redirectUri, all.Select(p => new KeyValuePair<string, string?>(p.Name, p.Value))));
    }

    private JsonObject Discovery() => new()
    {
        ["issuer"] = DiscoveredIssuer,
        ["authorization_endpoint"] = Base + "/authorize",
        ["token_endpoint"] = Base + "/token",
        ["jwks_uri"] = Base + "/keys",
        ["response_types_supported"] = new JsonArray("code"),
        ["subject_types_supported"] = new JsonArray("public"),
        ["id_token_signing_alg_values_supported"] = new JsonArray("RS256", "PS256", "ES256"),
        ["code_challenge_methods_supported"] = new JsonArray("S256"),
        ["token_endpoint_auth_methods_supported"] = new JsonArray([.. AdvertisedAuthMethods.Select(m => JsonValue.Create(m))]),
    };

    private JsonObject Keys()
    {
        var rsa = _rsa.ExportParameters(includePrivateParameters: false);
        var ec = _ec.ExportParameters(includePrivateParameters: false);
        return new JsonObject
        {
            ["keys"] = new JsonArray(
                new JsonObject { ["kty"] = "RSA", ["use"] = "sig", ["kid"] = _keyId + "-rsa", ["n"] = Base64UrlEncoder.Encode(rsa.Modulus), ["e"] = Base64UrlEncoder.Encode(rsa.Exponent) },
                new JsonObject { ["kty"] = "EC", ["use"] = "sig", ["kid"] = _keyId + "-ec", ["crv"] = "P-256", ["x"] = Base64UrlEncoder.Encode(ec.Q.X), ["y"] = Base64UrlEncoder.Encode(ec.Q.Y) }),
        };
    }

    private async Task<HttpResponseMessage> TokenAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var form = QueryHelpers.ParseQuery("?" + await request.Content!.ReadAsStringAsync(cancellationToken));
        var method = request.Headers.Authorization is { Scheme: "Basic" } ? ClientSecretBasic : ClientSecretPost;
        _used.Enqueue(method);
        if (!AcceptedAuthMethods.Contains(method) || ClientOf(request, form) != (ClientId, ClientSecret))
        {
            return Json(HttpStatusCode.Unauthorized, new JsonObject { ["error"] = "invalid_client" });
        }

        if (!_codes.TryRemove(form["code"].ToString(), out var authorization)
            || form["grant_type"].ToString() != "authorization_code"
            || form["redirect_uri"].ToString() != authorization.RedirectUri
            || Base64UrlEncoder.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(form["code_verifier"].ToString()))) != authorization.Challenge)
        {
            return Json(HttpStatusCode.BadRequest, new JsonObject { ["error"] = "invalid_grant" });
        }

        return Json(HttpStatusCode.OK, new JsonObject
        {
            ["access_token"] = Guid.NewGuid().ToString("N"),
            ["token_type"] = "Bearer",
            ["expires_in"] = 300,
            ["id_token"] = IdToken(authorization),
        });
    }

    private static (string? Id, string? Secret) ClientOf(HttpRequestMessage request, Dictionary<string, Microsoft.Extensions.Primitives.StringValues> form)
    {
        if (request.Headers.Authorization is not { Scheme: "Basic", Parameter: { } parameter })
        {
            return (form["client_id"].ToString(), form["client_secret"].ToString());
        }

        var pair = Encoding.UTF8.GetString(Convert.FromBase64String(parameter)).Split(':', 2);
        return (FormDecode(pair[0]), FormDecode(pair[1]));
    }

    private static string FormDecode(string value) => Uri.UnescapeDataString(value.Replace('+', ' '));

    private string IdToken(FakeAuthorization authorization)
    {
        var now = DateTimeOffset.UtcNow;
        var payload = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["iss"] = DiscoveredIssuer,
            ["aud"] = ClientId,
            ["iat"] = now.ToUnixTimeSeconds(),
            ["exp"] = now.AddMinutes(5).ToUnixTimeSeconds(),
            ["nonce"] = authorization.Nonce,
        };
        foreach (var (claim, value) in authorization.Claims)
        {
            payload[claim] = value;
        }

        return new JsonWebTokenHandler().CreateToken(JsonSerializer.Serialize(payload.Where(c => c.Value is not null).ToDictionary()), Credentials());
    }

    private SigningCredentials Credentials() => Signing switch
    {
        FakeSigning.ClientSecret => new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ClientSecret.PadRight(32, '-'))), SecurityAlgorithms.HmacSha256),
        FakeSigning.UnpublishedKey => new SigningCredentials(new RsaSecurityKey(RSA.Create(2048)) { KeyId = _keyId + "-rsa" }, SecurityAlgorithms.RsaSha256),
        _ when Algorithm.StartsWith("ES", StringComparison.Ordinal) => new SigningCredentials(new ECDsaSecurityKey(_ec) { KeyId = _keyId + "-ec" }, Algorithm),
        _ => new SigningCredentials(new RsaSecurityKey(_rsa) { KeyId = _keyId + "-rsa" }, Algorithm),
    };

    private static HttpResponseMessage Json(HttpStatusCode status, JsonObject body) => new(status)
    {
        Content = new StringContent(body.ToJsonString(), new MediaTypeHeaderValue("application/json")),
    };
}
