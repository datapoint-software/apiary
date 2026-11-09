using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class IssueAgentTokenHandler(StateTransaction transaction, AgentGrants grants, TimeProvider time) : ICommandHandler<IssueAgentToken, AgentTokenResult>
{
    public ValueTask<AgentTokenResult> HandleAsync(IssueAgentToken command, CancellationToken cancellationToken = default)
    {
        transaction.Unaudited = true;
        return new(command.GrantType switch
        {
            "authorization_code" => ExchangeCode(command),
            "refresh_token" => Refresh(command),
            _ => AgentTokenResult.Failed(AgentTokenResult.UnsupportedGrantType),
        });
    }

    private AgentTokenResult ExchangeCode(IssueAgentToken command)
    {
        if (string.IsNullOrEmpty(command.Code) || string.IsNullOrEmpty(command.CodeVerifier))
        {
            return AgentTokenResult.Failed(AgentTokenResult.InvalidRequest);
        }

        var now = time.GetUtcNow();
        var hash = SecretTokens.Hash(command.Code);
        var agent = transaction.State.Agents.Values.FirstOrDefault(a => a.Code?.Hash == hash);
        if (agent is null && transaction.State.Agents.Values.FirstOrDefault(a => a.UsedCodeHash == hash) is { } reused)
        {
            return Disconnect(reused);
        }

        return agent?.Code is { } code && code.ExpiresAt > now
            ? Exchange(agent, code, command, now)
            : AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
    }

    private AgentTokenResult Exchange(Agent agent, AgentCode code, IssueAgentToken command, DateTimeOffset now)
    {
        if (!Matches(agent, command) || !Verifies(command.CodeVerifier, code.Challenge) || !IsActive(agent))
        {
            transaction.Record(new AgentsRemoved([agent.Id]));
            return AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
        }

        return Issue(agent with { UsedCodeHash = code.Hash }, previousRefreshHash: null, now);
    }

    private AgentTokenResult Refresh(IssueAgentToken command)
    {
        if (string.IsNullOrEmpty(command.RefreshToken))
        {
            return AgentTokenResult.Failed(AgentTokenResult.InvalidRequest);
        }

        var now = time.GetUtcNow();
        var hash = SecretTokens.Hash(command.RefreshToken);
        var agent = transaction.State.Agents.Values.FirstOrDefault(a => a.Tokens?.RefreshHash == hash);
        if (agent is null && Issuer(command.RefreshToken) is { } reused)
        {
            return Disconnect(reused);
        }

        if (agent?.Tokens is not { } tokens || tokens.RefreshExpiresAt <= now || !IsActive(agent))
        {
            return AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
        }

        return agent.ClientId == command.ClientId
            ? Issue(agent, tokens.RefreshHash, now)
            : AgentTokenResult.Failed(AgentTokenResult.InvalidClient);
    }

    private AgentTokenResult Issue(Agent agent, string? previousRefreshHash, DateTimeOffset now)
    {
        var access = grants.NewAccess(agent.Id);
        var refresh = grants.NewRefresh(agent.Id);
        var ends = agent.ConnectedAt + AgentLifetimes.Connection;
        var accessExpiresAt = Earliest(now + AgentLifetimes.Access, ends);
        var tokens = new AgentTokens(SecretTokens.Hash(access), accessExpiresAt, SecretTokens.Hash(refresh), Earliest(now + AgentLifetimes.Refresh, ends), previousRefreshHash);
        transaction.Record(new AgentSaved(agent with { Code = null, Tokens = tokens, LastUsedAt = now }));
        return new AgentTokenResult(access, refresh, (int)(accessExpiresAt - now).TotalSeconds, Error: null);
    }

    private Agent? Issuer(string refreshToken) =>
        grants.RefreshAgent(refreshToken) is { } id ? transaction.State.Agents.GetValueOrDefault(id) : null;

    private AgentTokenResult Disconnect(Agent agent)
    {
        transaction.Record(new AgentsRemoved([agent.Id]));
        transaction.Unaudited = false;
        transaction.ActingAs = transaction.State.Users.GetValueOrDefault(agent.UserId)?.Email;
        transaction.Affects(agent.Id);
        return AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
    }

    private static DateTimeOffset Earliest(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;

    private bool IsActive(Agent agent) =>
        transaction.State.Users.TryGetValue(agent.UserId, out var user) && user.Status is UserStatus.Active;

    private static bool Matches(Agent agent, IssueAgentToken command) =>
        agent.ClientId == command.ClientId && agent.RedirectUri == command.RedirectUri;

    private static bool Verifies(string? verifier, string challenge)
    {
        if (verifier is not { Length: >= 43 and <= 128 })
        {
            return false;
        }

        var computed = Base64Url.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(computed), Encoding.ASCII.GetBytes(challenge));
    }
}
