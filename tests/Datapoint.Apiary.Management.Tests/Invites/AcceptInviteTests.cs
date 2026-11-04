using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Invites;
using Datapoint.Apiary.Management.Users;
using Datapoint.Apiary.Security.Passwords;
using Datapoint.Apiary.Security.TwoStep;

namespace Datapoint.Apiary.Management.Tests.Invites;

public sealed class AcceptInviteTests : IDisposable
{
    private const string Password = "a long passphrase of my own";
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_invite_shows_who_it_s_for()
    {
        var link = await InviteAsync();

        var invite = await _host.QueryAsync(new GetInvite(link.Token));

        Assert.Equal(("Bea", "bea@example.com"), (invite.Name, invite.Email));
    }

    [Fact]
    public async Task Accepting_an_invite_activates_the_user_with_their_password()
    {
        var link = await InviteAsync();
        var invite = await _host.QueryAsync(new GetInvite(link.Token));

        await _host.SendAsync(new AcceptInvite(link.Token, Password, invite.Enrollment.Challenge, CodeFor(invite.Enrollment.Secret)));

        var user = _host.State.Users[link.UserId];
        Assert.Equal((UserStatus.Active, true, (Invite?)null), (user.Status, PasswordHasher.Verify(Password, user.PasswordHash), user.Invite));
    }

    [Fact]
    public async Task Accepting_an_invite_signs_the_user_in()
    {
        var link = await InviteAsync();
        var invite = await _host.QueryAsync(new GetInvite(link.Token));

        await _host.SendAsync(new AcceptInvite(link.Token, Password, invite.Enrollment.Challenge, CodeFor(invite.Enrollment.Secret)));

        Assert.Contains(_host.State.Sessions.Values, s => s.UserId == link.UserId);
    }

    [Fact]
    public async Task An_invite_can_be_accepted_only_once()
    {
        var link = await InviteAsync();
        var invite = await _host.QueryAsync(new GetInvite(link.Token));
        await _host.SendAsync(new AcceptInvite(link.Token, Password, invite.Enrollment.Challenge, CodeFor(invite.Enrollment.Secret)));

        Assert.Equal(ErrorCodes.InviteInvalid, await _host.FailureAsync(new AcceptInvite(link.Token, "another long passphrase", invite.Enrollment.Challenge, CodeFor(invite.Enrollment.Secret))));
    }

    [Fact]
    public async Task An_expired_invite_isn_t_found()
    {
        var link = await InviteAsync();
        _host.Time.Advance(TimeSpan.FromHours(72));

        await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new GetInvite(link.Token)));
    }

    [Fact]
    public async Task A_renewed_invite_s_old_link_stops_working()
    {
        var link = await InviteAsync();
        _host.SignedIn(email: "admin@example.com");
        await _host.SendAsync(new RenewInvite(link.UserId));

        await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new GetInvite(link.Token)));
    }

    [Fact]
    public async Task An_unknown_token_isn_t_found() =>
        await Assert.ThrowsAsync<ActionFailedException>(() => _host.QueryAsync(new GetInvite("not-a-token")));

    [Fact]
    public async Task Another_user_s_enrollment_can_t_be_used()
    {
        var bea = await InviteAsync();
        _host.SignedIn(email: "admin@example.com");
        var carl = await _host.SendAsync(new InviteUser("Carl", "carl@example.com", Role.Viewer));
        var carlsInvite = await _host.QueryAsync(new GetInvite(carl.Token));

        Assert.Equal(ErrorCodes.ChallengeExpired, await _host.FailureAsync(new AcceptInvite(bea.Token, Password, carlsInvite.Enrollment.Challenge, CodeFor(carlsInvite.Enrollment.Secret))));
    }

    [Fact]
    public async Task The_password_can_t_contain_the_email()
    {
        var link = await InviteAsync();
        var invite = await _host.QueryAsync(new GetInvite(link.Token));

        Assert.Contains("Password: password.containsEmail", await _host.ErrorsAsync(new AcceptInvite(link.Token, "bea@example.com forever", invite.Enrollment.Challenge, CodeFor(invite.Enrollment.Secret))));
    }

    [Fact]
    public async Task Accepting_needs_a_code_from_the_authenticator_app()
    {
        var link = await InviteAsync();
        var invite = await _host.QueryAsync(new GetInvite(link.Token));

        Assert.Contains("Code: code.invalid", await _host.ErrorsAsync(new AcceptInvite(link.Token, Password, invite.Enrollment.Challenge, "000000")));
    }

    [Fact]
    public async Task Only_a_local_operator_can_create_an_administrator_from_the_command_line()
    {
        _host.SignedIn();

        Assert.Equal(ErrorCodes.Forbidden, await _host.FailureAsync(new CreateAdministrator("Bea", "bea@example.com")));
    }

    private async Task<InviteLink> InviteAsync()
    {
        _host.SignedIn();
        var link = await _host.SendAsync(new InviteUser("Bea", "bea@example.com", Role.Operator));
        _host.SignOut();
        return link;
    }

    private string CodeFor(string secret) => Totp.Compute(Base32.Decode(secret), Totp.Step(_host.Time.GetUtcNow()));
}
