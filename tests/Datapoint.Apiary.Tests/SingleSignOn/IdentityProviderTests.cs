using Microsoft.IdentityModel.Tokens;
using static Datapoint.Apiary.Tests.SingleSignOn.IdentityClaims;

namespace Datapoint.Apiary.Tests.SingleSignOn;

public sealed class IdentityProviderTests
{
    private const string EntraGroup = "c3d7f1a2-5b8e-4f6a-9d0c-1e2b3a4c5d6e";
    private static readonly string[] s_audiences = ["apiary", "graph"];
    private static readonly string[] s_entraGroups = ["f0e1d2c3-0000-4000-8000-000000000000", EntraGroup];
    private static readonly string[] s_appRoles = ["Apiary.Operator"];

    [Fact]
    public async Task An_issuer_with_a_trailing_slash_works()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider("https://tenant.id.example.com/"));

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task An_issuer_with_a_path_works()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider("https://id.example.com/realms/staff"));

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Theory]
    [InlineData(SecurityAlgorithms.RsaSha256)]
    [InlineData(SecurityAlgorithms.RsaSha512)]
    [InlineData(SecurityAlgorithms.RsaSsaPssSha256)]
    [InlineData(SecurityAlgorithms.EcdsaSha256)]
    public async Task ID_tokens_signed_with_common_algorithms_are_accepted(string algorithm)
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { Algorithm = algorithm });

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task A_provider_that_rotates_its_signing_key_is_followed()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson());
        browser.Provider.RotateKeys();

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task Unknown_signing_keys_fetch_the_provider_s_keys_at_most_every_five_minutes()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson());
        browser.Provider.RotateKeys();
        await browser.SignInAsync(APerson());
        browser.Provider.RotateKeys();

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task The_client_authenticates_with_basic_credentials_by_default()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson());

        Assert.Equal([FakeIdentityProvider.ClientSecretBasic], browser.Provider.UsedAuthMethods);
    }

    [Fact]
    public async Task Basic_credentials_are_form_encoded()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { ClientId = "apiary app", ClientSecret = "a+b/c:d%e~f" });

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task A_provider_that_only_takes_the_secret_in_the_body_gets_it_there()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider
        {
            AdvertisedAuthMethods = [FakeIdentityProvider.ClientSecretPost],
            AcceptedAuthMethods = [FakeIdentityProvider.ClientSecretPost],
        });
        await browser.SignInAsync(APerson());

        Assert.Equal([FakeIdentityProvider.ClientSecretPost], browser.Provider.UsedAuthMethods);
    }

    [Fact]
    public async Task A_client_registered_for_secrets_in_the_body_signs_in_after_basic_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { AcceptedAuthMethods = [FakeIdentityProvider.ClientSecretPost] });

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task A_wrong_client_secret_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider(), s => s with { ClientSecret = "wrong" });

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task Several_audiences_with_the_client_as_authorized_party_are_accepted()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson().With("aud", s_audiences).With("azp", "apiary")));
    }

    [Fact]
    public async Task Several_audiences_without_an_authorized_party_are_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("aud", s_audiences)));
    }

    [Fact]
    public async Task Another_authorized_party_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("azp", "another-client")));
    }

    [Fact]
    public async Task An_ID_token_without_email_verified_is_accepted()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson().Without("email_verified")));
    }

    [Fact]
    public async Task An_ID_token_without_an_email_is_refused_as_such()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.noEmail", await browser.SignInAsync(APerson().Without("email")));
    }

    [Theory]
    [InlineData(false)]
    [InlineData("false")]
    public async Task An_unverified_email_is_refused(object verified)
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.noEmail", await browser.SignInAsync(APerson().With("email_verified", verified)));
    }

    [Fact]
    public async Task A_verified_email_sent_as_text_is_accepted()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson().With("email_verified", "true")));
    }

    [Fact]
    public async Task Without_a_name_the_preferred_username_is_used()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson().Without("name").With("preferred_username", "rita.sousa"));

        Assert.Equal("rita.sousa", browser.App.State.Users.Values.Single().Name);
    }

    [Fact]
    public async Task Without_a_name_or_username_the_email_is_used()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson().Without("name"));

        Assert.Equal("rita@example.com", browser.App.State.Users.Values.Single().Name);
    }

    [Fact]
    public async Task A_single_group_sent_as_text_is_mapped()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson().With("groups", "admins")));
    }

    [Fact]
    public async Task Entra_ID_group_ids_are_mapped()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider(), s => s with { AdministratorGroups = [EntraGroup] });

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson().With("groups", s_entraGroups)));
    }

    [Fact]
    public async Task Entra_ID_app_roles_are_mapped_through_the_roles_claim()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider(), s => s with { GroupsClaim = "roles", OperatorGroups = ["Apiary.Operator"] });

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson().Without("groups").With("roles", s_appRoles)));
    }

    [Fact]
    public async Task Entra_ID_group_overage_can_t_sign_in()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.noRole", await browser.SignInAsync(APerson().Without("groups").With("_claim_names", new Dictionary<string, string> { ["groups"] = "src1" })));
    }
}
