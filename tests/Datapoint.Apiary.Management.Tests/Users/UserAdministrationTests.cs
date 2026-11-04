using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Users;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Apiary.Testing;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Users;

public sealed class UserAdministrationTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task An_administrator_invites_a_user()
    {
        _host.SignedIn();

        var link = await _host.SendAsync(new InviteUser("Bea", "Bea@Example.com", Role.Operator));

        var user = _host.State.Users[link.UserId];
        Assert.Equal(("Bea", "bea@example.com", Role.Operator, UserStatus.Invited), (user.Name, user.Email, user.Role, user.Status));
    }

    [Fact]
    public async Task An_invite_stores_only_the_hash_of_its_token()
    {
        _host.SignedIn();

        var link = await _host.SendAsync(new InviteUser("Bea", "bea@example.com", Role.Operator));

        Assert.Equal(SecretTokens.Hash(link.Token), _host.State.Users[link.UserId].Invite?.TokenHash);
    }

    [Fact]
    public async Task An_invite_lasts_72_hours()
    {
        _host.SignedIn();

        var link = await _host.SendAsync(new InviteUser("Bea", "bea@example.com", Role.Operator));

        Assert.Equal(TestClock.Now.AddHours(72), link.ExpiresAt);
    }

    [Fact]
    public async Task An_operator_can_t_invite_users()
    {
        _host.SignedIn(Role.Operator);

        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new InviteUser("Bea", "bea@example.com", Role.Viewer)));
    }

    [Fact]
    public async Task An_email_that_s_taken_can_t_be_invited()
    {
        _host.SignedIn();

        Assert.Contains("Email: email.taken", await _host.ErrorsAsync(new InviteUser("Ana", "ANA@example.com", Role.Viewer)));
    }

    [Fact]
    public async Task An_invite_needs_a_name()
    {
        _host.SignedIn();

        Assert.Contains("Name: required", await _host.ErrorsAsync(new InviteUser(" ", "bea@example.com", Role.Viewer)));
    }

    [Fact]
    public async Task An_invite_needs_a_known_role()
    {
        _host.SignedIn();

        Assert.Contains("Role: invalid", await _host.ErrorsAsync(new InviteUser("Bea", "bea@example.com", (Role)7)));
    }

    [Fact]
    public async Task Renewing_an_invite_replaces_its_token()
    {
        _host.SignedIn();
        var first = await _host.SendAsync(new InviteUser("Bea", "bea@example.com", Role.Viewer));

        var renewed = await _host.SendAsync(new RenewInvite(first.UserId));

        Assert.Equal(SecretTokens.Hash(renewed.Token), _host.State.Users[first.UserId].Invite?.TokenHash);
    }

    [Fact]
    public async Task An_active_user_s_invite_can_t_be_renewed()
    {
        var user = _host.SignedIn();

        Assert.Equal(ErrorCodes.UserNotInvited, await _host.FailureAsync(new RenewInvite(user.Id)));
    }

    [Fact]
    public async Task An_administrator_changes_a_user_s_role()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Viewer, "bea@example.com");

        await _host.SendAsync(new ChangeRole(bea.Id, Role.Operator));

        Assert.Equal(Role.Operator, _host.State.Users[bea.Id].Role);
    }

    [Fact]
    public async Task Changing_to_the_same_role_is_refused()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Viewer, "bea@example.com");

        Assert.Contains("Role: user.sameRole", await _host.ErrorsAsync(new ChangeRole(bea.Id, Role.Viewer)));
    }

    [Fact]
    public async Task The_last_administrator_can_t_lose_the_role()
    {
        var ana = _host.SignedIn();

        Assert.Equal(ErrorCodes.UserLastAdministrator, await _host.FailureAsync(new ChangeRole(ana.Id, Role.Operator)));
    }

    [Fact]
    public async Task An_administrator_can_step_down_when_another_remains()
    {
        var ana = _host.SignedIn();
        _host.AUserIn(Role.Administrator, "bea@example.com");

        await _host.SendAsync(new ChangeRole(ana.Id, Role.Operator));

        Assert.Equal(Role.Operator, _host.State.Users[ana.Id].Role);
    }

    [Fact]
    public async Task A_disabled_administrator_doesn_t_count_as_another_administrator()
    {
        var ana = _host.SignedIn();
        _host.Seed(new UserSaved(_host.AUserIn(Role.Administrator, "bea@example.com") with { Status = UserStatus.Disabled }));

        Assert.Equal(ErrorCodes.UserLastAdministrator, await _host.FailureAsync(new ChangeRole(ana.Id, Role.Operator)));
    }

    [Fact]
    public async Task A_role_from_single_sign_on_can_t_be_changed_here()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Viewer, "bea@example.com") with { ExternalId = "sso-bea" };
        _host.Seed(new UserSaved(bea));

        Assert.Equal(ErrorCodes.UserManagedBySso, await _host.FailureAsync(new ChangeRole(bea.Id, Role.Operator)));
    }

    [Fact]
    public async Task Changing_the_role_of_an_unknown_user_fails()
    {
        _host.SignedIn();

        Assert.Equal(ErrorCodes.UserNotFound, await _host.FailureAsync(new ChangeRole(AnId(), Role.Operator)));
    }

    [Fact]
    public async Task Disabling_a_user_ends_their_sessions()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Operator, "bea@example.com");
        _host.Seed(new SessionStarted(ASession(bea.Id)));

        await _host.SendAsync(new DisableUser(bea.Id));

        Assert.Equal((UserStatus.Disabled, 0), (_host.State.Users[bea.Id].Status, _host.State.Sessions.Count));
    }

    [Fact]
    public async Task Administrators_can_t_disable_themselves()
    {
        var ana = _host.SignedIn();
        _host.AUserIn(Role.Administrator, "bea@example.com");

        Assert.Equal(ErrorCodes.UserSelf, await _host.FailureAsync(new DisableUser(ana.Id)));
    }

    [Fact]
    public async Task A_disabled_user_can_t_be_disabled_again()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Operator, "bea@example.com") with { Status = UserStatus.Disabled };
        _host.Seed(new UserSaved(bea));

        Assert.Equal(ErrorCodes.Invalid, await _host.FailureAsync(new DisableUser(bea.Id)));
    }

    [Fact]
    public async Task Enabling_a_disabled_user_lets_them_in_again()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Operator, "bea@example.com") with { Status = UserStatus.Disabled };
        _host.Seed(new UserSaved(bea));

        await _host.SendAsync(new EnableUser(bea.Id));

        Assert.Equal(UserStatus.Active, _host.State.Users[bea.Id].Status);
    }

    [Fact]
    public async Task An_invited_user_can_t_be_enabled()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Operator, "bea@example.com") with { Status = UserStatus.Invited };
        _host.Seed(new UserSaved(bea));

        Assert.Equal(ErrorCodes.Invalid, await _host.FailureAsync(new EnableUser(bea.Id)));
    }

    [Fact]
    public async Task Deleting_a_user_removes_them()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Operator, "bea@example.com");

        await _host.SendAsync(new DeleteUser(bea.Id));

        Assert.DoesNotContain(bea.Id, _host.State.Users.Keys);
    }

    [Fact]
    public async Task Administrators_can_t_delete_themselves()
    {
        var ana = _host.SignedIn();
        _host.AUserIn(Role.Administrator, "bea@example.com");

        Assert.Equal(ErrorCodes.UserSelf, await _host.FailureAsync(new DeleteUser(ana.Id)));
    }

    [Fact]
    public async Task Resetting_two_step_signs_the_user_out_everywhere()
    {
        _host.SignedIn();
        var bea = _host.AUserIn(Role.Operator, "bea@example.com") with { TwoStep = new TwoStepSetup("secret", TestClock.Now, 0, []) };
        _host.Seed(new UserSaved(bea), new SessionStarted(ASession(bea.Id)), new AgentSaved(AnAgent(bea.Id)));

        await _host.SendAsync(new ResetTwoStep(bea.Id));

        Assert.Equal(((TwoStepSetup?)null, 0, 0), (_host.State.Users[bea.Id].TwoStep, _host.State.Sessions.Count, _host.State.Agents.Count));
    }

    [Theory]
    [InlineData(5)]
    [InlineData(720)]
    public async Task The_idle_timeout_can_be_set_from_5_minutes_to_12_hours(int minutes)
    {
        _host.SignedIn();

        await _host.SendAsync(new UpdateSessionPolicy(minutes));

        Assert.Equal(minutes, _host.State.SessionPolicy?.IdleMinutes);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(721)]
    public async Task An_idle_timeout_out_of_range_is_refused(int minutes)
    {
        _host.SignedIn();

        Assert.Contains("IdleMinutes: range", await _host.ErrorsAsync(new UpdateSessionPolicy(minutes)));
    }

    [Fact]
    public async Task Users_are_listed_without_secrets()
    {
        _host.SignedIn();

        var users = await _host.QueryAsync(new ListUsers());

        Assert.DoesNotContain("PasswordHash", users.Single().GetType().GetProperties().Select(p => p.Name));
    }
}
