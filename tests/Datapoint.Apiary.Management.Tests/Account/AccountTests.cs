using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Account;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Security.TwoStep;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Account;

public sealed class AccountTests : IDisposable
{
    private const string NewPassword = "a different long passphrase";
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Changing_the_password_stores_the_new_hash()
    {
        var user = _host.SignedIn(Role.Viewer);

        await _host.SendAsync(new ChangePassword(ManagementHost.Password, NewPassword));

        Assert.True(PasswordHasher.Verify(NewPassword, _host.State.Users[user.Id].PasswordHash));
    }

    [Fact]
    public async Task Changing_the_password_ends_the_other_sessions_and_disconnects_agents()
    {
        var user = _host.AUserIn(Role.Viewer);
        var current = ASession(user.Id);
        _host.Seed(new SessionStarted(current), new SessionStarted(ASession(user.Id)), new AgentSaved(AnAgent(user.Id)));
        _host.SignIn(user, current.Id);

        var result = await _host.SendAsync(new ChangePassword(ManagementHost.Password, NewPassword));

        Assert.Equal((1, 1, current.Id, 0), (result.Sessions, result.Agents, _host.State.Sessions.Keys.Single(), _host.State.Agents.Count));
    }

    [Fact]
    public async Task The_current_password_must_be_right()
    {
        _host.SignedIn(Role.Viewer);

        Assert.Contains("Current: password.incorrect", await _host.ErrorsAsync(new ChangePassword("wrong password", NewPassword)));
    }

    [Fact]
    public async Task Repeated_wrong_current_passwords_are_slowed_down()
    {
        _host.SignedIn(Role.Viewer);
        await _host.ErrorsAsync(new ChangePassword("wrong 1", NewPassword));
        await _host.ErrorsAsync(new ChangePassword("wrong 2", NewPassword));
        await _host.ErrorsAsync(new ChangePassword("wrong 3", NewPassword));
        await _host.ErrorsAsync(new ChangePassword("wrong 4", NewPassword));

        Assert.Equal(ErrorCodes.SignInThrottled, await _host.FailureAsync(new ChangePassword(ManagementHost.Password, NewPassword)));
    }

    [Theory]
    [InlineData("short", "Next: password.tooShort")]
    [InlineData("passwordpasswordpassword", "Next: password.common")]
    [InlineData(ManagementHost.Password, "Next: password.unchanged")]
    public async Task A_new_password_that_isn_t_strong_enough_is_refused(string next, string error)
    {
        _host.SignedIn(Role.Viewer);

        Assert.Contains(error, await _host.ErrorsAsync(new ChangePassword(ManagementHost.Password, next)));
    }

    [Fact]
    public async Task A_new_password_that_contains_the_email_is_refused()
    {
        _host.SignedIn(Role.Viewer);

        Assert.Contains("Next: password.containsEmail", await _host.ErrorsAsync(new ChangePassword(ManagementHost.Password, "my ana@example.com password")));
    }

    [Fact]
    public async Task A_breached_password_is_refused()
    {
        _host.SignedIn(Role.Viewer);
        _host.Breached.Breached.Add(NewPassword);

        Assert.Contains("Next: password.breached", await _host.ErrorsAsync(new ChangePassword(ManagementHost.Password, NewPassword)));
    }

    [Fact]
    public async Task Ending_another_session_removes_it()
    {
        var user = _host.SignedIn(Role.Viewer);
        var other = ASession(user.Id);
        _host.Seed(new SessionStarted(other));

        await _host.SendAsync(new EndSession(other.Id));

        Assert.Empty(_host.State.Sessions);
    }

    [Fact]
    public async Task Someone_else_s_session_can_t_be_ended()
    {
        _host.SignedIn(Role.Viewer);
        var theirs = ASession(_host.AUserIn(Role.Viewer, "bea@example.com").Id);
        _host.Seed(new SessionStarted(theirs));

        Assert.Equal(ErrorCodes.SessionNotFound, await _host.FailureAsync(new EndSession(theirs.Id)));
    }

    [Fact]
    public async Task Ending_the_other_sessions_keeps_the_current_one()
    {
        var user = _host.AUserIn(Role.Viewer);
        var current = ASession(user.Id);
        _host.Seed(new SessionStarted(current), new SessionStarted(ASession(user.Id)), new SessionStarted(ASession(user.Id)));
        _host.SignIn(user, current.Id);

        await _host.SendAsync(new EndOtherSessions());

        Assert.Equal([current.Id], _host.State.Sessions.Keys);
    }

    [Fact]
    public async Task Sessions_are_listed_current_first_without_expired_ones()
    {
        var user = _host.AUserIn(Role.Viewer);
        var current = ASession(user.Id) with { StartedAt = TestClock.Now.AddHours(-2) };
        var newer = ASession(user.Id);
        var expired = ASession(user.Id) with { ExpiresAt = TestClock.Now };
        _host.Seed(new SessionStarted(current), new SessionStarted(newer), new SessionStarted(expired));
        _host.SignIn(user, current.Id);

        var sessions = await _host.QueryAsync(new ListSessions());

        Assert.Equal([current.Id, newer.Id], sessions.Select(s => s.Id));
    }

    [Fact]
    public async Task Sessions_list_only_the_user_s_own()
    {
        _host.SignedIn(Role.Viewer);
        _host.Seed(new SessionStarted(ASession(_host.AUserIn(Role.Viewer, "bea@example.com").Id)));

        Assert.Empty(await _host.QueryAsync(new ListSessions()));
    }

    [Fact]
    public async Task Updating_the_profile_changes_the_name_and_email()
    {
        var user = _host.SignedIn(Role.Viewer);

        await _host.SendAsync(new UpdateProfile(" Ana Silva ", "Ana.Silva@Example.com"));

        Assert.Equal(("Ana Silva", "ana.silva@example.com"), (_host.State.Users[user.Id].Name, _host.State.Users[user.Id].Email));
    }

    [Fact]
    public async Task The_profile_can_t_take_someone_else_s_email()
    {
        _host.SignedIn(Role.Viewer);
        _host.AUserIn(Role.Viewer, "bea@example.com");

        Assert.Contains("Email: email.taken", await _host.ErrorsAsync(new UpdateProfile("Ana", "bea@example.com")));
    }

    [Fact]
    public async Task The_profile_keeps_its_own_email()
    {
        _host.SignedIn(Role.Viewer);

        Assert.Empty(await _host.ErrorsAsync(new UpdateProfile("Ana Silva", "ana@example.com")));
    }

    [Fact]
    public async Task A_profile_from_single_sign_on_can_t_be_changed_here()
    {
        var user = _host.AUserIn(Role.Viewer) with { ExternalId = "sso-ana" };
        _host.Seed(new UserSaved(user));
        _host.SignIn(user);

        Assert.Equal(ErrorCodes.UserManagedBySso, await _host.FailureAsync(new UpdateProfile("Ana", "ana@example.com")));
    }

    [Theory]
    [InlineData("en")]
    [InlineData("pt-PT")]
    public async Task A_supported_language_is_saved(string language)
    {
        var user = _host.SignedIn(Role.Viewer);

        await _host.SendAsync(new SetLanguage(language));

        Assert.Equal(language, _host.State.Users[user.Id].Language);
    }

    [Fact]
    public async Task An_unsupported_language_is_refused()
    {
        _host.SignedIn(Role.Viewer);

        Assert.Contains("Language: language.unsupported", await _host.ErrorsAsync(new SetLanguage("fr")));
    }

    [Fact]
    public async Task New_recovery_codes_replace_the_old_ones()
    {
        var user = WithTwoStep();

        var codes = await _host.SendAsync(new NewRecoveryCodes(ManagementHost.Password));

        Assert.Equal(codes.Select(RecoveryCodes.Hash), _host.State.Users[user.Id].TwoStep?.RecoveryCodeHashes);
    }

    [Fact]
    public async Task New_recovery_codes_need_the_password()
    {
        WithTwoStep();

        Assert.Contains("Password: password.incorrect", await _host.ErrorsAsync(new NewRecoveryCodes("wrong password")));
    }

    [Fact]
    public async Task New_recovery_codes_need_two_step_to_be_set_up()
    {
        _host.SignedIn(Role.Viewer);

        Assert.Equal(ErrorCodes.Invalid, await _host.FailureAsync(new NewRecoveryCodes(ManagementHost.Password)));
    }

    [Fact]
    public async Task Moving_to_a_new_authenticator_app_keeps_the_recovery_codes()
    {
        var user = WithTwoStep();
        var enrollment = await _host.QueryAsync(new BeginTwoStep());

        await _host.SendAsync(new ConfirmTwoStep(enrollment.Challenge, CodeFor(enrollment.Secret), ManagementHost.Password));

        Assert.Equal((enrollment.Secret, "recovery-hash"), (_host.State.Users[user.Id].TwoStep?.Secret, _host.State.Users[user.Id].TwoStep?.RecoveryCodeHashes.Single()));
    }

    [Fact]
    public async Task Moving_to_a_new_authenticator_app_needs_the_password()
    {
        WithTwoStep();
        var enrollment = await _host.QueryAsync(new BeginTwoStep());

        Assert.Contains("Password: password.incorrect", await _host.ErrorsAsync(new ConfirmTwoStep(enrollment.Challenge, CodeFor(enrollment.Secret), "wrong password")));
    }

    [Fact]
    public async Task Moving_to_a_new_authenticator_app_needs_a_code_from_it()
    {
        WithTwoStep();
        var enrollment = await _host.QueryAsync(new BeginTwoStep());

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new ConfirmTwoStep(enrollment.Challenge, "000000", ManagementHost.Password)));
    }

    [Fact]
    public async Task Someone_else_s_enrollment_can_t_be_confirmed()
    {
        WithTwoStep();
        var enrollment = await _host.QueryAsync(new BeginTwoStep());
        _host.SignedIn(Role.Viewer, "bea@example.com");

        Assert.Equal(ErrorCodes.ChallengeExpired, await _host.FailureAsync(new ConfirmTwoStep(enrollment.Challenge, CodeFor(enrollment.Secret), ManagementHost.Password)));
    }

    private User WithTwoStep()
    {
        var user = _host.AUserIn(Role.Viewer) with { TwoStep = new TwoStepSetup("JBSWY3DPEHPK3PXP", TestClock.Now.AddDays(-1), 0, ["recovery-hash"]) };
        _host.Seed(new UserSaved(user));
        _host.SignIn(user);
        return user;
    }

    private string CodeFor(string secret) => Totp.Compute(Base32.Decode(secret), Totp.Step(_host.Time.GetUtcNow()));
}
