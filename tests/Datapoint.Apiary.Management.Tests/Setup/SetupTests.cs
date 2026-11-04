using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Setup;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.TwoStep;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Management.Tests.Setup;

public sealed class SetupTests : IDisposable
{
    private const string Password = "a long first passphrase";
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Setup_is_open_on_a_new_cluster_for_15_minutes()
    {
        var status = await _host.QueryAsync(new GetSetupStatus());

        Assert.Equal(new SetupStatus(true, TestClock.Now.AddMinutes(15)), status);
    }

    [Fact]
    public async Task Setup_closes_after_15_minutes()
    {
        await _host.QueryAsync(new GetSetupStatus());
        _host.Time.Advance(TimeSpan.FromMinutes(15));

        Assert.Equal(new SetupStatus(false, null), await _host.QueryAsync(new GetSetupStatus()));
    }

    [Fact]
    public async Task Setup_is_closed_once_there_s_a_user()
    {
        _host.AUserIn();

        Assert.False((await _host.QueryAsync(new GetSetupStatus())).Open);
    }

    [Fact]
    public async Task Setup_creates_the_first_administrator()
    {
        var enrollment = await _host.QueryAsync(new BeginSetup("Ana", "Ana@Example.com", Password));

        await _host.SendAsync(new CompleteSetup("Ana", "ana@example.com", Password, enrollment.Challenge, CodeFor(enrollment.Secret)));

        var user = _host.State.Users.Values.Single();
        Assert.Equal(("ana@example.com", Role.Administrator, UserStatus.Active, true), (user.Email, user.Role, user.Status, PasswordHasher.Verify(Password, user.PasswordHash)));
    }

    [Fact]
    public async Task Setup_marks_the_cluster_as_set_up_and_signs_in()
    {
        var enrollment = await _host.QueryAsync(new BeginSetup("Ana", "ana@example.com", Password));

        await _host.SendAsync(new CompleteSetup("Ana", "ana@example.com", Password, enrollment.Challenge, CodeFor(enrollment.Secret)));

        Assert.Equal((true, 1, true), (_host.State.SetupCompleted, _host.State.Sessions.Count, _host.Cookie.Token is not null));
    }

    [Fact]
    public async Task Setup_returns_the_recovery_codes()
    {
        var enrollment = await _host.QueryAsync(new BeginSetup("Ana", "ana@example.com", Password));

        var codes = await _host.SendAsync(new CompleteSetup("Ana", "ana@example.com", Password, enrollment.Challenge, CodeFor(enrollment.Secret)));

        Assert.Equal(10, codes.Count);
    }

    [Fact]
    public async Task Setup_can_t_begin_once_closed()
    {
        _host.AUserIn();

        await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new BeginSetup("Bea", "bea@example.com", Password)));
    }

    [Fact]
    public async Task Setup_can_t_complete_once_someone_else_finished_it()
    {
        var enrollment = await _host.QueryAsync(new BeginSetup("Ana", "ana@example.com", Password));
        _host.AUserIn(email: "mallory@example.com");

        Assert.Equal(ErrorCodes.SetupClosed, await _host.FailureAsync(new CompleteSetup("Ana", "ana@example.com", Password, enrollment.Challenge, CodeFor(enrollment.Secret))));
    }

    [Fact]
    public async Task Setup_can_t_complete_for_another_email_than_it_began_with()
    {
        var enrollment = await _host.QueryAsync(new BeginSetup("Ana", "ana@example.com", Password));

        Assert.Equal(ErrorCodes.ChallengeExpired, await _host.FailureAsync(new CompleteSetup("Ana", "mallory@example.com", Password, enrollment.Challenge, CodeFor(enrollment.Secret))));
    }

    [Fact]
    public async Task Setup_needs_a_code_from_the_authenticator_app()
    {
        var enrollment = await _host.QueryAsync(new BeginSetup("Ana", "ana@example.com", Password));

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new CompleteSetup("Ana", "ana@example.com", Password, enrollment.Challenge, "000000")));
    }

    [Fact]
    public async Task Setup_refuses_a_password_that_contains_the_email()
    {
        var failure = await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => _host.QueryAsync(new BeginSetup("Ana", "ana@example.com", "ana@example.com rocks")));

        Assert.Contains("Password: password.containsEmail", failure.Errors.Select(e => $"{e.PropertyName}: {e.ErrorCode}"));
    }

    [Fact]
    public async Task Restoring_during_setup_needs_a_backup_this_cluster_can_read()
    {
        Assert.Contains("Content: backup.unreadable", await _host.ErrorsAsync(new RestoreSetup("apiary-backup-1:not a backup")));
    }

    [Fact]
    public async Task Restoring_during_setup_is_refused_once_setup_closed()
    {
        _host.AUserIn();

        Assert.Equal(ErrorCodes.SetupClosed, await _host.FailureAsync(new RestoreSetup("apiary-backup-1:anything")));
    }

    private string CodeFor(string secret) => Totp.Compute(Base32.Decode(secret), Totp.Step(_host.Time.GetUtcNow()));
}
