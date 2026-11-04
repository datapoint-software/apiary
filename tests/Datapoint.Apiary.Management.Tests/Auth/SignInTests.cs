using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Auth;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Security.TwoStep;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Management.Tests.Auth;

public sealed class SignInTests : IDisposable
{
    private const string Secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task The_right_password_asks_for_a_code_when_two_step_is_set_up()
    {
        WithTwoStep();

        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Equal((SignInNext.Code, null), (step.Next, step.Enrollment));
    }

    [Fact]
    public async Task The_right_password_asks_to_set_up_two_step_the_first_time()
    {
        _host.AUserIn();

        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Equal((SignInNext.Enroll, true), (step.Next, step.Enrollment is not null));
    }

    [Fact]
    public async Task The_email_is_matched_regardless_of_case_and_spaces()
    {
        WithTwoStep();

        var step = await _host.QueryAsync(new SignIn("  Ana@Example.com ", ManagementHost.Password));

        Assert.Equal(SignInNext.Code, step.Next);
    }

    [Fact]
    public async Task A_wrong_password_fails()
    {
        WithTwoStep();

        Assert.Equal(ErrorCodes.SignInFailed, await FailedSignInAsync("wrong password"));
    }

    [Fact]
    public async Task An_unknown_email_fails_the_same_way()
    {
        Assert.Equal(ErrorCodes.SignInFailed, (await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new SignIn("nobody@example.com", ManagementHost.Password)))).Code);
    }

    [Fact]
    public async Task A_disabled_user_can_t_sign_in()
    {
        _host.Seed(new UserSaved(_host.AUserIn() with { Status = UserStatus.Disabled }));

        Assert.Equal(ErrorCodes.SignInFailed, await FailedSignInAsync(ManagementHost.Password));
    }

    [Fact]
    public async Task An_invited_user_can_t_sign_in_with_a_password()
    {
        _host.Seed(new UserSaved(_host.AUserIn() with { Status = UserStatus.Invited }));

        Assert.Equal(ErrorCodes.SignInFailed, await FailedSignInAsync(ManagementHost.Password));
    }

    [Fact]
    public async Task Three_failures_aren_t_slowed_down()
    {
        WithTwoStep();
        await FailedSignInAsync("wrong 1");
        await FailedSignInAsync("wrong 2");
        await FailedSignInAsync("wrong 3");

        Assert.Equal(ErrorCodes.SignInFailed, await FailedSignInAsync("wrong 4"));
    }

    [Fact]
    public async Task Four_failures_slow_the_next_attempt_down()
    {
        WithTwoStep();
        await FailedSignInAsync("wrong 1");
        await FailedSignInAsync("wrong 2");
        await FailedSignInAsync("wrong 3");
        await FailedSignInAsync("wrong 4");

        Assert.Equal(ErrorCodes.SignInThrottled, await FailedSignInAsync(ManagementHost.Password));
    }

    [Fact]
    public async Task A_slowed_down_attempt_says_when_to_try_again()
    {
        WithTwoStep();
        await FailedSignInAsync("wrong 1");
        await FailedSignInAsync("wrong 2");
        await FailedSignInAsync("wrong 3");
        await FailedSignInAsync("wrong 4");

        var failure = await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password)));

        Assert.Equal(2, failure.Params?["retryAfter"]);
    }

    [Fact]
    public async Task Sign_in_is_allowed_again_after_the_delay()
    {
        WithTwoStep();
        await FailedSignInAsync("wrong 1");
        await FailedSignInAsync("wrong 2");
        await FailedSignInAsync("wrong 3");
        await FailedSignInAsync("wrong 4");
        _host.Time.Advance(TimeSpan.FromSeconds(2));

        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Equal(SignInNext.Code, step.Next);
    }

    [Fact]
    public async Task The_fifth_failure_is_audited()
    {
        var user = WithTwoStep();
        await FailedSignInAsync("wrong 1");
        await FailedSignInAsync("wrong 2");
        await FailedSignInAsync("wrong 3");
        await FailedSignInAsync("wrong 4");
        _host.Time.Advance(TimeSpan.FromSeconds(2));

        await FailedSignInAsync("wrong 5");

        var entry = _host.State.Audit.Single();
        Assert.Equal(("auth.sign-in", AuditOutcome.Failed, user.Email, user.Id), (entry.Action, entry.Outcome, entry.User, entry.UserId));
    }

    [Fact]
    public async Task Fewer_than_five_failures_aren_t_audited()
    {
        WithTwoStep();
        await FailedSignInAsync("wrong 1");
        await FailedSignInAsync("wrong 2");
        await FailedSignInAsync("wrong 3");

        await FailedSignInAsync("wrong 4");

        Assert.Empty(_host.State.Audit);
    }

    [Fact]
    public async Task A_code_from_the_authenticator_app_starts_a_session()
    {
        var user = WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.Equal(user.Id, _host.State.Sessions.Values.Single().UserId);
    }

    [Fact]
    public async Task A_new_session_gets_a_cookie_whose_hash_is_stored()
    {
        WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.Equal(SecretTokens.Hash(_host.Cookie.Token!), _host.State.Sessions.Values.Single().TokenHash);
    }

    [Fact]
    public async Task A_new_session_lasts_12_hours()
    {
        WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.Equal(TestClock.Now.AddHours(12), _host.State.Sessions.Values.Single().ExpiresAt);
    }

    [Fact]
    public async Task Signing_in_remembers_when()
    {
        var user = WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.Equal(TestClock.Now, _host.State.Users[user.Id].LastSignInAt);
    }

    [Fact]
    public async Task Signing_in_is_audited_as_the_user()
    {
        var user = WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.Equal(("auth.verify", user.Email), (_host.State.Audit.Single().Action, _host.State.Audit.Single().User));
    }

    [Fact]
    public async Task Signing_in_ends_the_user_s_expired_sessions()
    {
        var user = WithTwoStep();
        var expired = new Cluster.Sessions.Session(Guid.CreateVersion7(), user.Id, "hash", TestClock.Now.AddDays(-1), TestClock.Now.AddMinutes(-1), null, null);
        _host.Seed(new Cluster.Sessions.SessionStarted(expired));
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.DoesNotContain(expired.Id, _host.State.Sessions.Keys);
    }

    [Fact]
    public async Task A_wrong_code_is_refused()
    {
        WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new VerifySignIn(step.Challenge, "000000")));
    }

    [Fact]
    public async Task A_code_can_t_be_used_twice()
    {
        WithTwoStep();
        var first = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));
        await _host.SendAsync(new VerifySignIn(first.Challenge, CurrentCode(Secret)));
        var second = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new VerifySignIn(second.Challenge, CurrentCode(Secret))));
    }

    [Fact]
    public async Task A_recovery_code_signs_in_once()
    {
        WithTwoStep(recoveryCode: "ABCD-EFGH-JKMN-PQRS");
        var first = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));
        await _host.SendAsync(new VerifySignIn(first.Challenge, "abcd-efgh-jkmn-pqrs"));
        var second = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new VerifySignIn(second.Challenge, "ABCD-EFGH-JKMN-PQRS")));
    }

    [Fact]
    public async Task A_challenge_expires_after_10_minutes()
    {
        WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));
        _host.Time.Advance(TimeSpan.FromMinutes(10));

        Assert.Equal(ErrorCodes.ChallengeExpired, await _host.FailureAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret))));
    }

    [Fact]
    public async Task A_challenge_that_was_changed_is_refused()
    {
        WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        Assert.Equal(ErrorCodes.ChallengeExpired, await _host.FailureAsync(new VerifySignIn(step.Challenge[..^2], CurrentCode(Secret))));
    }

    [Fact]
    public async Task A_user_disabled_after_the_password_step_can_t_finish_signing_in()
    {
        var user = WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));
        _host.Seed(new UserSaved(user with { Status = UserStatus.Disabled }));

        Assert.Equal(ErrorCodes.ChallengeExpired, await _host.FailureAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret))));
    }

    [Fact]
    public async Task Setting_up_two_step_returns_recovery_codes()
    {
        _host.AUserIn();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        var result = await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(step.Enrollment!.Secret)));

        Assert.Equal(10, result.RecoveryCodes?.Count);
    }

    [Fact]
    public async Task Setting_up_two_step_stores_only_hashes_of_the_recovery_codes()
    {
        var user = _host.AUserIn();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        var result = await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(step.Enrollment!.Secret)));

        Assert.Equal(result.RecoveryCodes!.Select(RecoveryCodes.Hash), _host.State.Users[user.Id].TwoStep?.RecoveryCodeHashes);
    }

    [Fact]
    public async Task Signing_in_with_a_code_returns_no_recovery_codes()
    {
        WithTwoStep();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));

        var result = await _host.SendAsync(new VerifySignIn(step.Challenge, CurrentCode(Secret)));

        Assert.Null(result.RecoveryCodes);
    }

    [Fact]
    public async Task An_enrollment_challenge_can_t_replace_an_existing_two_step_setup()
    {
        var user = _host.AUserIn();
        var step = await _host.QueryAsync(new SignIn("ana@example.com", ManagementHost.Password));
        _host.Seed(new UserSaved(user with { TwoStep = new TwoStepSetup(Secret, TestClock.Now, 0, []) }));

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new VerifySignIn(step.Challenge, CurrentCode(step.Enrollment!.Secret))));
    }

    [Theory]
    [InlineData("", "a password", "Email: required")]
    [InlineData("ana", "a password", "Email: email.invalid")]
    [InlineData("ana@example.com", "", "Password: required")]
    public async Task Sign_in_needs_an_email_and_a_password(string email, string password, string error)
    {
        var failure = await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => _host.QueryAsync(new SignIn(email, password)));

        Assert.Contains(error, failure.Errors.Select(e => $"{e.PropertyName}: {e.ErrorCode}"));
    }

    private User WithTwoStep(string? recoveryCode = null)
    {
        var user = _host.AUserIn() with { TwoStep = new TwoStepSetup(Secret, TestClock.Now.AddDays(-1), 0, recoveryCode is null ? [] : [RecoveryCodes.Hash(recoveryCode)]) };
        _host.Seed(new UserSaved(user));
        return user;
    }

    private string CurrentCode(string secret) => Totp.Compute(Base32.Decode(secret), Totp.Step(_host.Time.GetUtcNow()));

    private async Task<string> FailedSignInAsync(string password) =>
        (await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new SignIn("ana@example.com", password)))).Code;
}
