using System.Security.Cryptography.X509Certificates;
using Datapoint.Apiary.Certificates.Acme;
using Datapoint.Apiary.Certificates.Tests.Fakes;
using Datapoint.Apiary.Testing;
using Microsoft.Extensions.Time.Testing;

namespace Datapoint.Apiary.Certificates.Tests.Acme;

public sealed class AcmeClientTests : IDisposable
{
    private readonly FakeAcmeServer _server = new();
    private readonly HttpClient _http;
    private readonly FakeTimeProvider _time = TestClock.Fake();
    private readonly AcmeClient _client;

    public AcmeClientTests()
    {
        _http = new HttpClient(_server);
        _client = new AcmeClient(_http, _time);
    }

    public void Dispose()
    {
        _http.Dispose();
        _server.Dispose();
    }

    [Fact]
    public async Task An_account_is_created_with_the_contact_email()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, " ops@example.com ", Ct);

        Assert.Equal(("https://acme.test/account/1", FakeAcmeServer.DirectoryUrl), (account.AccountUrl, account.DirectoryUrl));
        Assert.Equal("mailto:ops@example.com", _server.Contacts.Single());
    }

    [Fact]
    public async Task An_account_without_an_email_has_no_contact()
    {
        await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);

        Assert.Empty(_server.Contacts);
    }

    [Fact]
    public async Task An_order_asks_for_the_HTTP_01_challenge()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);

        var order = await _client.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Http01, Ct);

        var challenge = order.Challenges.Single();
        Assert.Equal(("shop.example.com", "token-1"), (challenge.Host, challenge.Token));
        Assert.StartsWith("token-1.", challenge.KeyAuthorization, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_order_can_ask_for_the_DNS_01_challenge()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);

        var order = await _client.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Dns01, Ct);

        Assert.Equal("dns", order.Challenges.Single().Token);
    }

    [Fact]
    public async Task Completing_an_order_returns_the_signed_chain()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);
        var order = await _client.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Http01, Ct);

        var chain = await _client.CompleteAsync(account, order, SigningRequest("shop.example.com"), Ct);

        using var leaf = X509Certificate2.CreateFromPem(chain);
        Assert.True(_server.ChallengeAccepted);
        Assert.Equal("CN=shop.example.com", leaf.Subject);
    }

    [Fact]
    public async Task The_directory_is_read_once()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);

        await _client.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Http01, Ct);

        Assert.Single(_server.Requests, r => r == "GET /directory");
    }

    [Fact]
    public async Task A_rejected_nonce_is_retried_once()
    {
        _server.BadNoncesToSend = 1;

        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);

        Assert.NotNull(account.AccountUrl);
    }

    [Fact]
    public async Task A_nonce_rejected_twice_fails()
    {
        _server.BadNoncesToSend = 2;

        var exception = await Assert.ThrowsAsync<AcmeException>(() => _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct));

        Assert.Equal(AcmeErrors.Rejected, exception.Code);
    }

    [Fact]
    public async Task A_rate_limit_is_reported_as_such()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);
        _server.OrderProblem = "rateLimited";

        var exception = await Assert.ThrowsAsync<AcmeException>(() => _client.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Http01, Ct));

        Assert.Equal((AcmeErrors.RateLimited, "Too many certificates already issued"), (exception.Code, exception.Detail));
    }

    [Theory]
    [InlineData("connection")]
    [InlineData("dns")]
    [InlineData("unauthorized")]
    [InlineData("caa")]
    public async Task A_failed_challenge_says_why(string problem)
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);
        var order = await _client.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Http01, Ct);
        _server.AuthorizationStatus = "invalid";
        _server.AuthorizationProblem = problem;

        var exception = await Assert.ThrowsAsync<AcmeException>(() => _client.CompleteAsync(account, order, SigningRequest("shop.example.com"), Ct));

        Assert.Equal((AcmeErrors.ChallengeFailed, "Fetching the token failed"), (exception.Code, exception.Detail));
    }

    [Fact]
    public async Task An_unreachable_server_is_reported_as_such()
    {
        _server.Unreachable = true;

        var exception = await Assert.ThrowsAsync<AcmeException>(() => _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct));

        Assert.Equal((AcmeErrors.Unreachable, "Connection refused"), (exception.Code, exception.Detail));
    }

    [Fact]
    public async Task An_account_key_is_kept_to_sign_later_requests()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);
        var other = new AcmeClient(_http, _time);

        var order = await other.OrderAsync(account, ["shop.example.com"], AcmeChallengeType.Http01, Ct);

        Assert.Single(order.Challenges);
    }

    [Fact]
    public async Task Someone_else_s_account_url_with_a_new_key_is_refused()
    {
        var account = await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct);
        var forged = account with { KeyPem = (await _client.CreateAccountAsync(FakeAcmeServer.DirectoryUrl, null, Ct)).KeyPem };

        await Assert.ThrowsAsync<AcmeException>(() => _client.OrderAsync(forged, ["shop.example.com"], AcmeChallengeType.Http01, Ct));
    }

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static byte[] SigningRequest(string host)
    {
        using var key = System.Security.Cryptography.ECDsa.Create(System.Security.Cryptography.ECCurve.NamedCurves.nistP256);
        var request = new CertificateRequest("CN=" + host, key, System.Security.Cryptography.HashAlgorithmName.SHA256);
        return request.CreateSigningRequest();
    }
}
