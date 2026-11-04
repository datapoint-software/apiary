using Datapoint.Apiary.Tests.Hosting;
using static Datapoint.Apiary.Tests.SingleSignOn.IdentityClaims;

namespace Datapoint.Apiary.Tests.SingleSignOn;

public sealed class SsoSignInTests
{
    private static readonly string[] s_unmappedGroups = ["staff"];

    [Fact]
    public async Task A_person_in_a_mapped_group_lands_on_the_page_they_asked_for()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("signed in at /projects?view=all", await browser.SignInAsync(APerson(), next: "/projects?view=all"));
    }

    [Fact]
    public async Task The_signed_in_session_belongs_to_the_provider_s_person()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson());

        var me = await AdminSession.PostAsync(browser.Client, "auth/me");

        Assert.Equal(("Rita Sousa", "rita@example.com", "administrator"), (me["name"]!.GetValue<string>(), me["email"]!.GetValue<string>(), me["role"]!.GetValue<string>()));
    }

    [Fact]
    public async Task The_user_is_found_by_issuer_and_subject()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        await browser.SignInAsync(APerson());

        Assert.Equal("https://id.example.com|248289761001", browser.App.State.Users.Values.Single().ExternalId);
    }

    [Fact]
    public async Task A_person_in_no_mapped_group_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.noRole", await browser.SignInAsync(APerson().With("groups", s_unmappedGroups)));
    }

    [Fact]
    public async Task A_destination_on_another_site_becomes_the_home_page()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson(), next: "//evil.example.com/"));
    }

    [Fact]
    public async Task Signing_in_while_single_sign_on_is_off_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider(), s => s with { Enabled = false });

        using var response = await browser.Client.GetAsync(new Uri("/auth/sso/start", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal("/sign-in?error=sso.off", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task A_callback_with_another_state_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        var callback = browser.Provider.Authorize(await browser.StartSignInAsync(), APerson());

        Assert.Equal("sso.failed", await browser.ReturnAsync(new Uri(callback.ToString().Replace("state=", "state=x", StringComparison.Ordinal))));
    }

    [Fact]
    public async Task A_callback_without_the_flow_cookie_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        var callback = browser.Provider.Authorize(await browser.StartSignInAsync(), APerson());
        using var stranger = Clients.Admin(browser.App, allowRedirects: false);

        using var response = await stranger.GetAsync(new Uri(callback.PathAndQuery, UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal("/sign-in?error=sso.failed", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task A_callback_can_be_used_only_once()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        var callback = browser.Provider.Authorize(await browser.StartSignInAsync(), APerson());
        await browser.ReturnAsync(callback);

        Assert.Equal("sso.failed", await browser.ReturnAsync(callback));
    }

    [Fact]
    public async Task A_person_who_cancels_at_the_provider_is_sent_back_to_sign_in()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.ReturnAsync(browser.Provider.Deny(await browser.StartSignInAsync(), "access_denied")));
    }

    [Fact]
    public async Task A_callback_naming_another_issuer_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());
        var callback = browser.Provider.Authorize(await browser.StartSignInAsync(), APerson());

        Assert.Equal("sso.failed", await browser.ReturnAsync(new Uri(callback + "&iss=" + Uri.EscapeDataString("https://evil.example.com"))));
    }

    [Fact]
    public async Task A_callback_naming_the_provider_as_issuer_is_accepted()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { SendsIssuerOnCallback = true });

        Assert.Equal("signed in at /", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task An_ID_token_for_another_sign_in_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("nonce", "another")));
    }

    [Fact]
    public async Task An_ID_token_for_another_client_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("aud", "another-client")));
    }

    [Fact]
    public async Task An_ID_token_from_another_issuer_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("iss", "https://evil.example.com")));
    }

    [Fact]
    public async Task An_ID_token_from_the_issuer_with_a_trailing_slash_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("iss", "https://id.example.com/")));
    }

    [Fact]
    public async Task An_expired_ID_token_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("exp", DateTimeOffset.UtcNow.AddMinutes(-3).ToUnixTimeSeconds())));
    }

    [Fact]
    public async Task An_ID_token_without_an_expiry_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().With("exp", null)));
    }

    [Fact]
    public async Task An_ID_token_signed_with_a_key_the_provider_doesn_t_publish_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { Signing = FakeSigning.UnpublishedKey });

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task An_ID_token_signed_with_the_client_secret_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { Signing = FakeSigning.ClientSecret });

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson()));
    }

    [Fact]
    public async Task An_ID_token_without_a_subject_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider());

        Assert.Equal("sso.failed", await browser.SignInAsync(APerson().Without("sub")));
    }

    [Fact]
    public async Task A_discovery_document_naming_another_issuer_is_refused()
    {
        await using var browser = await SsoBrowser.StartAsync(new FakeIdentityProvider { DiscoveredIssuer = "https://evil.example.com" });

        using var response = await browser.Client.GetAsync(new Uri("/auth/sso/start", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal("/sign-in?error=sso.failed", response.Headers.Location?.ToString());
    }
}
