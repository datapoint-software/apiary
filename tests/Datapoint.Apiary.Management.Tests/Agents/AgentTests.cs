using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Agents;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Testing;
using Datapoint.Mediator.Authorization;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Agents;

public sealed class AgentTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public AgentTests() => _host.SignedIn(Role.Viewer);

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Approving_a_client_sends_the_browser_back_with_a_code_and_the_state()
    {
        var connection = new AgentConnection(_host);

        var connected = await _host.SendAsync(connection.Approval("xyz"));

        var query = AgentConnection.Query(connected.RedirectTo);
        Assert.Equal(("xyz", connected.Id), (query["state"], _host.State.Agents.Values.Single().Id));
        Assert.Equal(connected.Id, _host.Get<AgentGrants>().CodeAgent(query["code"]));
    }

    [Fact]
    public async Task A_client_id_apiary_didn_t_issue_is_refused()
    {
        var connection = new AgentConnection(_host);

        Assert.Equal(ErrorCodes.AgentClientUnknown, await _host.FailureAsync(connection.Approval() with { ClientId = "made-up" }));
    }

    [Fact]
    public async Task A_redirect_the_client_didn_t_register_is_refused()
    {
        var connection = new AgentConnection(_host);

        Assert.Equal(ErrorCodes.AgentRedirectUnknown, await _host.FailureAsync(connection.Approval() with { RedirectUri = "http://127.0.0.1:9999/callback" }));
    }

    [Fact]
    public async Task Only_the_S256_challenge_method_is_accepted()
    {
        var connection = new AgentConnection(_host);

        Assert.Contains("CodeChallengeMethod: agent.challengeInvalid", await _host.ErrorsAsync(connection.Approval() with { CodeChallengeMethod = "plain" }));
    }

    [Fact]
    public void A_client_can_only_register_a_redirect_on_this_computer()
    {
        var exception = Assert.Throws<ActionFailedException>(() => new AgentConnection(_host, "https://agents.example.com/callback"));

        Assert.Equal(ErrorCodes.AgentRedirectInvalid, exception.Code);
    }

    [Fact]
    public async Task A_client_can_register_a_redirect_on_a_trusted_origin()
    {
        _host.Seed(new AgentPolicySaved(new AgentPolicy(["https://agents.example.com"])));
        var connection = new AgentConnection(_host, "https://agents.example.com/callback");

        var tokens = await connection.TokensAsync();

        Assert.NotNull(tokens.AccessToken);
    }

    [Fact]
    public async Task A_code_and_its_verifier_get_tokens_that_last_an_hour()
    {
        var connection = new AgentConnection(_host);

        var tokens = await connection.TokensAsync();

        Assert.Equal((3600, (string?)null), (tokens.ExpiresIn, tokens.Error));
        Assert.Equal(_host.State.Agents.Values.Single().Id, _host.Get<AgentGrants>().AccessAgent(tokens.AccessToken!));
    }

    [Fact]
    public async Task A_connected_agent_is_listed_for_its_user()
    {
        var connection = new AgentConnection(_host);
        await connection.TokensAsync();

        var agents = await _host.QueryAsync(new ListAgents());

        Assert.Equal(("Claude", true), (agents.Single().Name, agents.Single().Mine));
    }

    [Fact]
    public async Task A_wrong_verifier_refuses_the_code_and_forgets_the_agent()
    {
        var connection = new AgentConnection(_host);
        var code = await connection.CodeAsync();

        var result = await _host.SendAsync(connection.Exchange(code, new string('a', 43)));

        Assert.Equal(AgentTokenResult.InvalidGrant, result.Error);
        Assert.Empty(_host.State.Agents);
    }

    [Fact]
    public async Task A_code_for_another_redirect_is_refused()
    {
        var connection = new AgentConnection(_host);
        var code = await connection.CodeAsync();

        var result = await _host.SendAsync(connection.Exchange(code) with { RedirectUri = "http://127.0.0.1:1/other" });

        Assert.Equal(AgentTokenResult.InvalidGrant, result.Error);
    }

    [Fact]
    public async Task A_code_expires_after_2_minutes()
    {
        var connection = new AgentConnection(_host);
        var code = await connection.CodeAsync();
        _host.Time.Advance(AgentLifetimes.Code);

        Assert.Equal(AgentTokenResult.InvalidGrant, (await _host.SendAsync(connection.Exchange(code))).Error);
    }

    [Fact]
    public async Task Using_a_code_twice_disconnects_the_agent()
    {
        var connection = new AgentConnection(_host);
        var code = await connection.CodeAsync();
        await _host.SendAsync(connection.Exchange(code));

        var second = await _host.SendAsync(connection.Exchange(code));

        Assert.Equal(AgentTokenResult.InvalidGrant, second.Error);
        Assert.Empty(_host.State.Agents);
    }

    [Fact]
    public async Task A_refresh_token_gets_new_tokens()
    {
        var connection = new AgentConnection(_host);
        var first = await connection.TokensAsync();

        var second = await _host.SendAsync(connection.Refresh(first.RefreshToken!));

        Assert.Null(second.Error);
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);
    }

    [Fact]
    public async Task Reusing_a_refresh_token_disconnects_the_agent()
    {
        var connection = new AgentConnection(_host);
        var first = await connection.TokensAsync();
        await _host.SendAsync(connection.Refresh(first.RefreshToken!));

        var reused = await _host.SendAsync(connection.Refresh(first.RefreshToken!));

        Assert.Equal(AgentTokenResult.InvalidGrant, reused.Error);
        Assert.Empty(_host.State.Agents);
    }

    [Fact]
    public async Task Disconnecting_through_a_reused_token_is_audited_as_its_user()
    {
        var connection = new AgentConnection(_host);
        var first = await connection.TokensAsync();
        await _host.SendAsync(connection.Refresh(first.RefreshToken!));
        _host.SignOut();

        await _host.SendAsync(connection.Refresh(first.RefreshToken!));

        Assert.Equal("ana@example.com", _host.State.Audit.Last().User);
    }

    [Fact]
    public async Task Another_client_can_t_use_a_refresh_token()
    {
        var connection = new AgentConnection(_host);
        var tokens = await connection.TokensAsync();

        var result = await _host.SendAsync(connection.Refresh(tokens.RefreshToken!) with { ClientId = new AgentConnection(_host).ClientId });

        Assert.Equal(AgentTokenResult.InvalidClient, result.Error);
    }

    [Fact]
    public async Task A_refresh_token_expires_after_30_days()
    {
        var connection = new AgentConnection(_host);
        var tokens = await connection.TokensAsync();
        _host.Time.Advance(AgentLifetimes.Refresh);

        Assert.Equal(AgentTokenResult.InvalidGrant, (await _host.SendAsync(connection.Refresh(tokens.RefreshToken!))).Error);
    }

    [Fact]
    public async Task A_connection_ends_after_90_days_however_often_it_s_refreshed()
    {
        var connection = new AgentConnection(_host);
        var tokens = await connection.TokensAsync();
        tokens = await RefreshAfterAsync(connection, tokens, TimeSpan.FromDays(29));
        tokens = await RefreshAfterAsync(connection, tokens, TimeSpan.FromDays(29));
        tokens = await RefreshAfterAsync(connection, tokens, TimeSpan.FromDays(29));

        var last = await RefreshAfterAsync(connection, tokens, TimeSpan.FromDays(3) - TimeSpan.FromMinutes(30));

        Assert.Equal(1800, last.ExpiresIn);
    }

    [Fact]
    public async Task A_disabled_user_s_agent_can_t_refresh()
    {
        var connection = new AgentConnection(_host);
        var tokens = await connection.TokensAsync();
        var user = _host.State.Users.Values.Single();
        _host.Seed(new UserSaved(user with { Status = UserStatus.Disabled }));

        Assert.Equal(AgentTokenResult.InvalidGrant, (await _host.SendAsync(connection.Refresh(tokens.RefreshToken!))).Error);
    }

    [Fact]
    public async Task An_unknown_grant_type_is_refused()
    {
        Assert.Contains("GrantType: unsupported_grant_type", await _host.ErrorsAsync(new IssueAgentToken("password")));
    }

    [Fact]
    public async Task A_token_that_isn_t_apiary_s_is_refused()
    {
        var connection = new AgentConnection(_host);

        Assert.Contains("RefreshToken: invalid_grant", await _host.ErrorsAsync(connection.Refresh("made-up")));
    }

    [Fact]
    public async Task Connecting_the_same_client_again_replaces_its_agent()
    {
        var connection = new AgentConnection(_host);
        await connection.TokensAsync();

        var second = await _host.SendAsync(connection.Approval());

        Assert.Equal(second.Id, _host.State.Agents.Values.Single().Id);
    }

    [Fact]
    public async Task A_person_can_connect_at_most_20_agents()
    {
        var user = _host.State.Users.Values.Single();
        _host.Seed([.. Enumerable.Range(0, AgentLifetimes.MaxPerUser).Select(i => new AgentSaved(Connected(user.Id) with { ClientId = $"client-{i}" }))]);

        Assert.Equal(ErrorCodes.AgentTooMany, await _host.FailureAsync(new AgentConnection(_host).Approval()));
    }

    [Fact]
    public async Task Agents_that_are_over_don_t_count_towards_the_limit()
    {
        var user = _host.State.Users.Values.Single();
        _host.Seed([.. Enumerable.Range(0, AgentLifetimes.MaxPerUser).Select(i => new AgentSaved(AnAgent(user.Id) with { ClientId = $"client-{i}" }))]);

        await _host.SendAsync(new AgentConnection(_host).Approval());

        Assert.Single(_host.State.Agents);
    }

    [Fact]
    public async Task Revoking_a_token_disconnects_its_agent()
    {
        var connection = new AgentConnection(_host);
        var tokens = await connection.TokensAsync();

        var result = await _host.SendAsync(new RevokeAgentToken(tokens.AccessToken!, connection.ClientId));

        Assert.Null(result.Error);
        Assert.Empty(_host.State.Agents);
    }

    [Fact]
    public async Task Another_client_can_t_revoke_a_token()
    {
        var connection = new AgentConnection(_host);
        var tokens = await connection.TokensAsync();

        var result = await _host.SendAsync(new RevokeAgentToken(tokens.RefreshToken!, new AgentConnection(_host).ClientId));

        Assert.Equal(AgentTokenResult.InvalidGrant, result.Error);
        Assert.Single(_host.State.Agents);
    }

    [Fact]
    public async Task A_person_disconnects_their_own_agent()
    {
        var connection = new AgentConnection(_host);
        await connection.TokensAsync();

        await _host.SendAsync(new DisconnectAgent(_host.State.Agents.Values.Single().Id));

        Assert.Empty(_host.State.Agents);
    }

    [Fact]
    public async Task A_person_can_t_see_or_disconnect_someone_else_s_agent()
    {
        var other = _host.AUserIn(Role.Operator, "bea@example.com");
        var agent = Connected(other.Id);
        _host.Seed(new AgentSaved(agent));

        Assert.Empty(await _host.QueryAsync(new ListAgents()));
        Assert.Equal(ErrorCodes.AgentNotFound, await _host.FailureAsync(new DisconnectAgent(agent.Id)));
    }

    [Fact]
    public async Task An_administrator_can_disconnect_anyone_s_agent()
    {
        var other = _host.AUserIn(Role.Viewer, "bea@example.com");
        var agent = Connected(other.Id);
        _host.Seed(new AgentSaved(agent));
        _host.SignedIn(Role.Administrator, "carla@example.com");

        await _host.SendAsync(new DisconnectAgent(agent.Id));

        Assert.Empty(_host.State.Agents);
    }

    [Fact]
    public async Task Removing_a_trusted_origin_disconnects_the_agents_that_return_there()
    {
        _host.Seed(new AgentPolicySaved(new AgentPolicy(["https://agents.example.com"])));
        await new AgentConnection(_host, "https://agents.example.com/callback").TokensAsync();
        await new AgentConnection(_host).TokensAsync();
        _host.SignedIn(Role.Administrator, "carla@example.com");

        await _host.SendAsync(new UpdateAgentPolicy([]));

        Assert.Equal(AgentConnection.LocalCallback, _host.State.Agents.Values.Single().RedirectUri);
    }

    [Fact]
    public async Task Trusted_origins_are_saved_without_a_trailing_slash()
    {
        _host.SignedIn(Role.Administrator, "carla@example.com");

        await _host.SendAsync(new UpdateAgentPolicy([" https://agents.example.com/ ", "https://agents.example.com"]));

        Assert.Equal("https://agents.example.com", _host.State.AgentPolicy?.TrustedOrigins.Single());
    }

    [Theory]
    [InlineData("http://agents.example.com")]
    [InlineData("https://agents.example.com/path")]
    [InlineData("https://agents.example.com/?a=1")]
    [InlineData("agents.example.com")]
    public async Task A_trusted_origin_must_be_a_bare_https_origin(string origin)
    {
        _host.SignedIn(Role.Administrator, "carla@example.com");

        Assert.Contains("TrustedOrigins: agent.originInvalid", await _host.ErrorsAsync(new UpdateAgentPolicy([origin])));
    }

    [Fact]
    public async Task At_most_20_origins_can_be_trusted()
    {
        _host.SignedIn(Role.Administrator, "carla@example.com");

        Assert.Contains("TrustedOrigins: agent.originsTooMany", await _host.ErrorsAsync(new UpdateAgentPolicy([.. Enumerable.Range(0, 21).Select(i => $"https://agents{i}.example.com")])));
    }

    [Fact]
    public async Task Only_an_administrator_trusts_origins()
    {
        await Assert.ThrowsAsync<AccessDeniedException>(() => _host.SendAsync(new UpdateAgentPolicy([])));
    }

    private async Task<AgentTokenResult> RefreshAfterAsync(AgentConnection connection, AgentTokenResult tokens, TimeSpan wait)
    {
        _host.Time.Advance(wait);
        return await _host.SendAsync(connection.Refresh(tokens.RefreshToken!));
    }

    private static Agent Connected(Guid userId) =>
        AnAgent(userId) with { Tokens = new AgentTokens("access", TestClock.Now.AddHours(1), "refresh", TestClock.Now.AddDays(30), null) };
}
