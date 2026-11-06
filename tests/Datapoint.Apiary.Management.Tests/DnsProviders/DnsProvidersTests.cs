using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.DnsProviders;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.DnsProviders;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.DnsProviders;

public sealed class DnsProvidersTests : IDisposable
{
    private const string Secret = "c2VjcmV0LWZvci10ZXN0cy0zMi1ieXRlcy1sb25nLi4=";
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    public static AddDnsProvider OfficeDns(string domain = "corp.example.com") =>
        new("Office DNS", DnsProviderKind.Rfc2136, [domain], Server: "10.0.0.53", KeyName: "apiary-acme", Algorithm: "hmac-sha256", Secret: Secret);

    [Fact]
    public async Task An_administrator_adds_a_provider_and_it_s_tested()
    {
        _host.SignedIn();

        var result = await _host.SendAsync(OfficeDns());

        var provider = _host.State.DnsProviders[result.Id];
        Assert.True(result.Test.Succeeded);
        Assert.Equal(["corp.example.com"], provider.Domains);
        Assert.Equal(Secret, provider.Secrets["secret"]);
        Assert.Equal(["add Office DNS corp.example.com _apiary-test.corp.example.com", "remove Office DNS corp.example.com _apiary-test.corp.example.com"], _host.DnsProviders.Calls);
    }

    [Fact]
    public async Task A_provider_that_fails_its_test_is_saved_with_the_reason()
    {
        _host.SignedIn();
        _host.DnsProviders.Failure = new DnsException(DnsErrors.Unauthorized, "BADKEY");

        var result = await _host.SendAsync(OfficeDns());

        Assert.Equal(DnsErrors.Unauthorized, result.Test.Code);
        Assert.Equal(DnsErrors.Unauthorized, _host.State.DnsProviders[result.Id].LastTest!.Code);
    }

    [Fact]
    public async Task An_operator_can_t_add_a_provider()
    {
        _host.SignedIn(Role.Operator);

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(OfficeDns()));
    }

    [Fact]
    public async Task The_list_never_shows_credentials()
    {
        _host.SignedIn(Role.Viewer);
        _host.Seed(new DnsProviderSaved(ADnsProvider()));

        var provider = Assert.Single(await _host.QueryAsync(new ListDnsProviders()));

        Assert.Equal(("Office DNS", DnsProviderKind.Rfc2136), (provider.Name, provider.Kind));
    }

    [Fact]
    public async Task Details_say_which_credentials_are_set_without_showing_them()
    {
        _host.SignedIn();
        var saved = ADnsProvider();
        _host.Seed(new DnsProviderSaved(saved));

        var details = await _host.QueryAsync(new GetDnsProvider(saved.Id));

        Assert.Equal(["secret"], details.SecretsSet);
        Assert.DoesNotContain(Secret, details.Settings.Values);
    }

    [Theory]
    [InlineData("", "Name", ErrorCodes.Required)]
    [InlineData("*.example.com", "Domains", ErrorCodes.HostnameInvalid)]
    public async Task A_provider_with_mistakes_is_refused(string domain, string field, string code)
    {
        _host.SignedIn();

        var command = OfficeDns(domain) with { Name = field == "Name" ? "" : "Office DNS" };

        Assert.Contains($"{field}: {code}", await _host.ErrorsAsync(command));
    }

    [Fact]
    public async Task Each_kind_asks_for_its_own_credentials()
    {
        _host.SignedIn();

        var errors = await _host.ErrorsAsync(new AddDnsProvider("Cloudflare", DnsProviderKind.Cloudflare, ["example.com"]));

        Assert.Equal([$"Token: {ErrorCodes.Required}"], errors);
    }

    [Fact]
    public async Task A_TSIG_secret_must_be_Base64()
    {
        _host.SignedIn();

        Assert.Contains($"Secret: {ErrorCodes.DnsProviderSecretInvalid}", await _host.ErrorsAsync(OfficeDns() with { Secret = "not base64!" }));
    }

    [Fact]
    public async Task A_domain_has_only_one_provider()
    {
        _host.SignedIn();
        _host.Seed(new DnsProviderSaved(ADnsProvider("corp.example.com") with { Name = "Other" }));

        Assert.Contains($"Domains: {ErrorCodes.DnsProviderDomainTaken}", await _host.ErrorsAsync(OfficeDns()));
    }

    [Fact]
    public async Task Domains_can_nest_under_another_provider_s()
    {
        _host.SignedIn();
        _host.Seed(new DnsProviderSaved(ADnsProvider("example.com") with { Name = "Hetzner" }));

        Assert.Empty(await _host.ErrorsAsync(OfficeDns("corp.example.com")));
    }

    [Fact]
    public async Task The_challenge_zone_can_t_be_one_of_its_domains()
    {
        _host.SignedIn();

        Assert.Contains($"ChallengeZone: {ErrorCodes.DnsProviderChallengeZoneOverlaps}", await _host.ErrorsAsync(OfficeDns() with { ChallengeZone = "corp.example.com" }));
    }

    [Fact]
    public async Task Updating_without_a_secret_keeps_the_current_one()
    {
        _host.SignedIn();
        var saved = ADnsProvider();
        _host.Seed(new DnsProviderSaved(saved));
        var command = new UpdateDnsProvider(saved.Id, "Office DNS", DnsProviderKind.Rfc2136, ["example.com"], Server: "10.0.0.54", KeyName: "apiary-acme", Algorithm: "hmac-sha512");

        await _host.SendAsync(command);

        var provider = _host.State.DnsProviders[saved.Id];
        Assert.Equal(("10.0.0.54", saved.Secrets["secret"]), (provider.Settings["server"], provider.Secrets["secret"]));
    }

    [Fact]
    public async Task A_provider_in_use_can_t_be_removed()
    {
        _host.SignedIn();
        var provider = ADnsProvider();
        _host.Seed(new DnsProviderSaved(provider), new CertificateRequested(ACertificate() with { DnsProviderId = provider.Id }));

        Assert.Equal(ErrorCodes.DnsProviderInUse, await _host.FailureAsync(new RemoveDnsProvider(provider.Id)));
    }

    [Fact]
    public async Task Removing_a_provider_forgets_its_credentials()
    {
        _host.SignedIn();
        var provider = ADnsProvider();
        _host.Seed(new DnsProviderSaved(provider));

        await _host.SendAsync(new RemoveDnsProvider(provider.Id));

        Assert.Empty(_host.State.DnsProviders);
    }

    [Fact]
    public async Task A_test_records_its_result()
    {
        _host.SignedIn();
        var provider = ADnsProvider();
        _host.Seed(new DnsProviderSaved(provider));

        var test = await _host.SendAsync(new TestDnsProvider(provider.Id));

        Assert.True(test.Succeeded);
        Assert.True(_host.State.DnsProviders[provider.Id].LastTest!.Succeeded);
    }
}
