using System.Security.Cryptography;
using System.Text;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class IssueAgentTokenHandler(StateTransaction transaction, TimeProvider time) : ICommandHandler<IssueAgentToken, AgentTokenResult>
{
    public ValueTask<AgentTokenResult> HandleAsync(IssueAgentToken command, CancellationToken ct = default)
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
        if (agent?.Code is not { } code || code.ExpiresAt <= now)
        {
            return AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
        }

        if (!Matches(agent, command) || !Verifies(command.CodeVerifier, code.Challenge) || !IsActive(agent))
        {
            transaction.Record(new AgentsRemoved([agent.Id]));
            return AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
        }

        return Issue(agent, previousRefreshHash: null, now);
    }

    private AgentTokenResult Refresh(IssueAgentToken command)
    {
        if (string.IsNullOrEmpty(command.RefreshToken))
        {
            return AgentTokenResult.Failed(AgentTokenResult.InvalidRequest);
        }

        var now = time.GetUtcNow();
        var hash = SecretTokens.Hash(command.RefreshToken);
        if (transaction.State.Agents.Values.FirstOrDefault(a => a.Tokens?.PreviousRefreshHash == hash) is { } reused)
        {
            transaction.Record(new AgentsRemoved([reused.Id]));
            return AgentTokenResult.Failed(AgentTokenResult.InvalidGrant);
        }

        var agent = transaction.State.Agents.Values.FirstOrDefault(a => a.Tokens?.RefreshHash == hash);
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
        var access = SecretTokens.New();
        var refresh = SecretTokens.New();
        var tokens = new AgentTokens(SecretTokens.Hash(access), now + AgentLifetimes.Access, SecretTokens.Hash(refresh), now + AgentLifetimes.Refresh, previousRefreshHash);
        transaction.Record(new AgentSaved(agent with { Code = null, Tokens = tokens, LastUsedAt = now }));
        return new AgentTokenResult(access, refresh, (int)AgentLifetimes.Access.TotalSeconds, Error: null);
    }

    private bool IsActive(Agent agent) =>
        transaction.State.Users.TryGetValue(agent.UserId, out var user) && user.Status is UserStatus.Active;

    private static bool Matches(Agent agent, IssueAgentToken command) =>
        agent.ClientId == command.ClientId && agent.RedirectUri == command.RedirectUri;

    private static bool Verifies(string verifier, string challenge)
    {
        if (verifier.Length is < 43 or > 128)
        {
            return false;
        }

        var computed = Base64Url.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(computed), Encoding.ASCII.GetBytes(challenge));
    }
}
