using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Datapoint.Apiary.Testing;
using Datapoint.Apiary.Testing.Certificates;

namespace Datapoint.Apiary.Certificates.Tests.Fakes;

public sealed class FakeAcmeServer : HttpMessageHandler
{
    public const string DirectoryUrl = "https://acme.test/directory";
    private const string ProblemPrefix = "urn:ietf:params:acme:error:";
    private readonly TestAuthority _authority = new("Fake ACME");
    private readonly HashSet<string> _nonces = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ECDsa> _accounts = new(StringComparer.Ordinal);
    private int _nonceCount;
    private string? _host;
    private string? _chain;

    public IList<string> Requests { get; } = [];

    public IList<string> Contacts { get; } = [];

    public bool ChallengeAccepted { get; private set; }

    public int BadNoncesToSend { get; set; }

    public string? AuthorizationProblem { get; set; }

    public string? OrderProblem { get; set; }

    public string AuthorizationStatus { get; set; } = "valid";

    public bool Unreachable { get; set; }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _authority.Dispose();
            foreach (var key in _accounts.Values)
            {
                key.Dispose();
            }
        }

        base.Dispose(disposing);
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Unreachable)
        {
            throw new HttpRequestException("Connection refused");
        }

        var path = request.RequestUri!.AbsolutePath;
        Requests.Add($"{request.Method} {path}");
        if (request.Method == HttpMethod.Get && path == "/directory")
        {
            return Json(HttpStatusCode.OK, new JsonObject
            {
                ["newNonce"] = "https://acme.test/nonce",
                ["newAccount"] = "https://acme.test/account",
                ["newOrder"] = "https://acme.test/order",
            });
        }

        if (request.Method == HttpMethod.Head && path == "/nonce")
        {
            return WithNonce(new HttpResponseMessage(HttpStatusCode.OK));
        }

        var body = JsonNode.Parse(await request.Content!.ReadAsStringAsync(cancellationToken))!;
        var header = JsonNode.Parse(Decode(body["protected"]!.GetValue<string>()))!;
        var payload = Decode(body["payload"]!.GetValue<string>());
        if (!_nonces.Remove(header["nonce"]!.GetValue<string>()) || BadNoncesToSend-- > 0)
        {
            return Problem(HttpStatusCode.BadRequest, "badNonce", "Bad nonce");
        }

        if (header["url"]!.GetValue<string>() != request.RequestUri.ToString() || !Verifies(header, body))
        {
            return Problem(HttpStatusCode.Unauthorized, "malformed", "Bad signature");
        }

        return path switch
        {
            "/account" => NewAccount(header, payload),
            "/order" => NewOrder(payload),
            "/authz/1" => Authorization(),
            "/chall/1" => Accept(),
            "/finalize/1" => Finalize(payload),
            "/order/1" => Order(),
            "/cert/1" => Certificate(request),
            _ => Problem(HttpStatusCode.NotFound, "malformed", "Not found"),
        };
    }

    private HttpResponseMessage NewAccount(JsonNode header, string payload)
    {
        var key = KeyOf(header["jwk"]!);
        var url = "https://acme.test/account/" + (_accounts.Count + 1);
        _accounts[url] = key;
        foreach (var contact in JsonNode.Parse(payload)!["contact"]?.AsArray() ?? [])
        {
            Contacts.Add(contact!.GetValue<string>());
        }

        var response = Json(HttpStatusCode.Created, new JsonObject { ["status"] = "valid" });
        response.Headers.Location = new Uri(url);
        return response;
    }

    private HttpResponseMessage NewOrder(string payload)
    {
        if (OrderProblem is { } problem)
        {
            return Problem(HttpStatusCode.TooManyRequests, problem, "Too many certificates already issued");
        }

        _host = JsonNode.Parse(payload)!["identifiers"]![0]!["value"]!.GetValue<string>();
        var response = Json(HttpStatusCode.Created, OrderResource("pending"));
        response.Headers.Location = new Uri("https://acme.test/order/1");
        return response;
    }

    private HttpResponseMessage Authorization()
    {
        var status = ChallengeAccepted ? AuthorizationStatus : "pending";
        var challenge = new JsonObject { ["type"] = "http-01", ["url"] = "https://acme.test/chall/1", ["token"] = "token-1", ["status"] = status };
        if (ChallengeAccepted && AuthorizationProblem is { } problem)
        {
            challenge["error"] = new JsonObject { ["type"] = ProblemPrefix + problem, ["detail"] = "Fetching the token failed" };
        }

        return Json(HttpStatusCode.OK, new JsonObject
        {
            ["status"] = status,
            ["identifier"] = new JsonObject { ["type"] = "dns", ["value"] = _host },
            ["challenges"] = new JsonArray(new JsonObject { ["type"] = "dns-01", ["url"] = "https://acme.test/chall/2", ["token"] = "dns" }, challenge),
        });
    }

    private HttpResponseMessage Accept()
    {
        ChallengeAccepted = true;
        return Json(HttpStatusCode.OK, new JsonObject { ["status"] = "processing" });
    }

    private HttpResponseMessage Finalize(string payload)
    {
        var csr = Base64Url(JsonNode.Parse(payload)!["csr"]!.GetValue<string>());
        _chain = _authority.Sign(csr, TestClock.Now.AddMinutes(-1), TestClock.Now.AddDays(90));
        return Json(HttpStatusCode.OK, OrderResource("processing"));
    }

    private HttpResponseMessage Order() => Json(HttpStatusCode.OK, OrderResource(_chain is null ? "processing" : "valid"));

    private HttpResponseMessage Certificate(HttpRequestMessage request) =>
        request.Headers.Accept.ToString() == "application/pem-certificate-chain"
            ? WithNonce(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(_chain!) })
            : Problem(HttpStatusCode.NotAcceptable, "malformed", "Wrong format");

    private static JsonObject OrderResource(string status)
    {
        var order = new JsonObject
        {
            ["status"] = status,
            ["authorizations"] = new JsonArray("https://acme.test/authz/1"),
            ["finalize"] = "https://acme.test/finalize/1",
        };
        if (status == "valid")
        {
            order["certificate"] = "https://acme.test/cert/1";
        }

        return order;
    }

    private bool Verifies(JsonNode header, JsonNode body)
    {
        var kid = header["kid"]?.GetValue<string>();
        var key = kid is null ? null : _accounts.GetValueOrDefault(kid);
        if (kid is not null && key is null)
        {
            return false;
        }

        using var fromJwk = key is null ? KeyOf(header["jwk"]!) : null;
        var signed = Encoding.ASCII.GetBytes(body["protected"]!.GetValue<string>() + "." + body["payload"]!.GetValue<string>());
        return (key ?? fromJwk!).VerifyData(signed, Base64Url(body["signature"]!.GetValue<string>()), HashAlgorithmName.SHA256);
    }

    private static ECDsa KeyOf(JsonNode jwk) => ECDsa.Create(new ECParameters
    {
        Curve = ECCurve.NamedCurves.nistP256,
        Q = new ECPoint { X = Base64Url(jwk["x"]!.GetValue<string>()), Y = Base64Url(jwk["y"]!.GetValue<string>()) },
    });

    private HttpResponseMessage Json(HttpStatusCode status, JsonNode content) =>
        WithNonce(new HttpResponseMessage(status) { Content = new StringContent(content.ToJsonString(), Encoding.UTF8, "application/json") });

    private HttpResponseMessage Problem(HttpStatusCode status, string type, string detail)
    {
        var response = Json(status, new JsonObject { ["type"] = ProblemPrefix + type, ["detail"] = detail });
        response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/problem+json");
        return response;
    }

    private HttpResponseMessage WithNonce(HttpResponseMessage response)
    {
        var nonce = "nonce-" + Interlocked.Increment(ref _nonceCount);
        _nonces.Add(nonce);
        response.Headers.Add("Replay-Nonce", nonce);
        return response;
    }

    private static string Decode(string value) => Encoding.UTF8.GetString(Base64Url(value));

    private static byte[] Base64Url(string value) => System.Buffers.Text.Base64Url.DecodeFromChars(value);
}
