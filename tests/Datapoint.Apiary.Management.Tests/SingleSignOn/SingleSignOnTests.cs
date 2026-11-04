using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.SingleSignOn;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.SingleSignOn;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.SingleSignOn;

public sealed class SingleSignOnTests : IDisposable
{
    private const string Issuer = "https://id.example.com";
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_administrator_saves_the_settings_trimmed()
    {
        _host.SignedIn();

        await _host.SendAsync(Settings() with { Issuer = " https://id.example.com/ ", AdministratorGroups = [" admins ", "admins", ""] });

        Assert.Equal(("https://id.example.com", "admins"), (_host.State.SingleSignOn?.Issuer, _host.State.SingleSignOn?.AdministratorGroups.Single()));
    }

    [Fact]
    public async Task The_client_secret_is_never_shown()
    {
        _host.SignedIn();
        await _host.SendAsync(Settings());

        var view = await _host.QueryAsync(new GetSsoSettings());

        Assert.DoesNotContain(nameof(SsoSettings.ClientSecret), view.GetType().GetProperties().Select(p => p.Name));
    }

    [Fact]
    public async Task An_empty_client_secret_keeps_the_saved_one()
    {
        _host.SignedIn();
        await _host.SendAsync(Settings());

        await _host.SendAsync(Settings() with { ClientSecret = null, DisplayName = "Renamed" });

        Assert.Equal("client-secret", _host.State.SingleSignOn?.ClientSecret);
    }

    [Fact]
    public async Task The_first_settings_need_a_client_secret()
    {
        _host.SignedIn();

        Assert.Contains("ClientSecret: required", await _host.ErrorsAsync(Settings() with { ClientSecret = "" }));
    }

    [Theory]
    [InlineData("http://id.example.com")]
    [InlineData("https://id.example.com/?tenant=1")]
    [InlineData("https://user:pass@id.example.com")]
    [InlineData("id.example.com")]
    public async Task An_issuer_that_isn_t_a_plain_https_address_is_refused(string issuer)
    {
        _host.SignedIn();

        Assert.Contains("Issuer: sso.issuerInvalid", await _host.ErrorsAsync(Settings() with { Issuer = issuer }));
    }

    [Fact]
    public async Task At_least_one_group_needs_a_role()
    {
        _host.SignedIn();

        Assert.Contains("ViewerGroups: sso.groupsRequired", await _host.ErrorsAsync(Settings() with { AdministratorGroups = [], OperatorGroups = [" "], ViewerGroups = [] }));
    }

    [Fact]
    public async Task Turning_single_sign_on_off_ends_its_users_sessions()
    {
        _host.SignedIn();
        await _host.SendAsync(Settings());
        var external = SsoUser();
        var local = _host.AUserIn(Role.Viewer, "local@example.com");
        _host.Seed(new SessionStarted(ASession(external.Id)), new SessionStarted(ASession(local.Id)));

        await _host.SendAsync(Settings() with { Enabled = false });

        Assert.Equal(local.Id, _host.State.Sessions.Values.Single().UserId);
    }

    [Fact]
    public async Task An_operator_can_t_change_single_sign_on()
    {
        _host.SignedIn(Role.Operator);

        await Assert.ThrowsAsync<Datapoint.Mediator.Authorization.AccessDeniedException>(() => _host.SendAsync(Settings()));
    }

    [Fact]
    public async Task A_new_person_from_an_administrators_group_becomes_an_administrator()
    {
        await EnabledAsync();

        await _host.SendAsync(new SignInWithSso(Assertion("bea@example.com", ["admins"])));

        var user = _host.State.Users.Values.Single(u => u.ExternalId is not null);
        Assert.Equal(("bea@example.com", Role.Administrator, $"{Issuer}|bea"), (user.Email, user.Role, user.ExternalId));
    }

    [Fact]
    public async Task The_highest_role_of_a_person_s_groups_applies()
    {
        await EnabledAsync();

        await _host.SendAsync(new SignInWithSso(Assertion("bea@example.com", ["viewers", "operators"])));

        Assert.Equal(Role.Operator, _host.State.Users.Values.Single(u => u.ExternalId is not null).Role);
    }

    [Fact]
    public async Task A_person_s_role_follows_their_groups_at_each_sign_in()
    {
        await EnabledAsync();
        await _host.SendAsync(new SignInWithSso(Assertion("bea@example.com", ["admins"])));

        await _host.SendAsync(new SignInWithSso(Assertion("bea@example.com", ["viewers"])));

        Assert.Equal(Role.Viewer, _host.State.Users.Values.Single(u => u.ExternalId is not null).Role);
    }

    [Fact]
    public async Task Signing_in_with_single_sign_on_starts_a_session()
    {
        await EnabledAsync();

        await _host.SendAsync(new SignInWithSso(Assertion("bea@example.com", ["viewers"])));

        Assert.NotNull(_host.Cookie.Token);
    }

    [Fact]
    public async Task A_person_in_no_mapped_group_is_refused_and_audited()
    {
        await EnabledAsync();

        Assert.Equal(ErrorCodes.SsoNoRole, await _host.FailureAsync(new SignInWithSso(Assertion("bea@example.com", ["guests"]))));
        Assert.Equal(AuditOutcome.Failed, _host.State.Audit.Last().Outcome);
    }

    [Fact]
    public async Task Single_sign_on_can_t_take_over_a_local_account()
    {
        await EnabledAsync();

        Assert.Equal(ErrorCodes.SsoEmailTaken, await _host.FailureAsync(new SignInWithSso(Assertion("ana@example.com", ["admins"]))));
    }

    [Fact]
    public async Task A_disabled_person_can_t_sign_in_with_single_sign_on()
    {
        await EnabledAsync();
        _host.Seed(new UserSaved(SsoUser() with { Status = UserStatus.Disabled }));

        Assert.Equal(ErrorCodes.SsoDisabled, await _host.FailureAsync(new SignInWithSso(Assertion("bea@example.com", ["viewers"]))));
    }

    [Fact]
    public async Task An_assertion_expires_after_2_minutes()
    {
        await EnabledAsync();
        var assertion = Assertion("bea@example.com", ["viewers"]);
        _host.Time.Advance(SsoAssertions.Lifetime);

        Assert.Equal(ErrorCodes.SsoFailed, await _host.FailureAsync(new SignInWithSso(assertion)));
    }

    [Fact]
    public async Task A_forged_assertion_is_refused()
    {
        await EnabledAsync();

        Assert.Equal(ErrorCodes.SsoFailed, await _host.FailureAsync(new SignInWithSso("forged")));
    }

    [Fact]
    public async Task An_assertion_from_another_issuer_is_refused()
    {
        await EnabledAsync();
        var assertion = _host.Get<SsoAssertions>().Seal("https://other.example.com", "bea", "bea@example.com", "Bea", ["admins"]);

        Assert.Equal(ErrorCodes.SsoOff, await _host.FailureAsync(new SignInWithSso(assertion)));
    }

    [Fact]
    public async Task Single_sign_on_that_s_off_refuses_assertions()
    {
        await EnabledAsync();
        _host.SignedIn(Role.Administrator, "carla@example.com");
        await _host.SendAsync(Settings() with { Enabled = false });
        _host.SignOut();

        Assert.Equal(ErrorCodes.SsoOff, await _host.FailureAsync(new SignInWithSso(Assertion("bea@example.com", ["viewers"]))));
    }

    [Fact]
    public async Task An_assertion_without_an_email_is_refused()
    {
        await EnabledAsync();

        Assert.Equal(ErrorCodes.SsoNoEmail, await _host.FailureAsync(new SignInWithSso(Assertion("", ["viewers"]))));
    }

    [Fact]
    public async Task A_person_without_a_name_is_named_after_their_email()
    {
        await EnabledAsync();

        await _host.SendAsync(new SignInWithSso(_host.Get<SsoAssertions>().Seal(Issuer, "bea", "bea@example.com", " \u0007 ", ["viewers"])));

        Assert.Equal("bea@example.com", _host.State.Users.Values.Single(u => u.ExternalId is not null).Name);
    }

    private async Task EnabledAsync()
    {
        _host.SignedIn();
        await _host.SendAsync(Settings());
        _host.SignOut();
    }

    private User SsoUser()
    {
        var user = AUser("bea@example.com", Role.Viewer) with { PasswordHash = null, ExternalId = $"{Issuer}|bea" };
        _host.Seed(new UserSaved(user));
        return user;
    }

    private string Assertion(string email, IReadOnlyList<string> groups) =>
        _host.Get<SsoAssertions>().Seal(Issuer, "bea", email, "Bea", groups);

    private static UpdateSsoSettings Settings() =>
        new(true, "Example ID", Issuer, "apiary", "client-secret", "groups", ["admins"], ["operators"], ["viewers"]);
}
