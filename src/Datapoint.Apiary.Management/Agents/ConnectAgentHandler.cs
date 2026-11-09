using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class ConnectAgentHandler(StateTransaction transaction, AgentClients clients, AgentGrants grants, CurrentUser current, TimeProvider time)
    : ICommandHandler<ConnectAgent, ConnectedAgent>
{
    public ValueTask<ConnectedAgent> HandleAsync(ConnectAgent command, CancellationToken cancellationToken = default)
    {
        if (current.SessionId is null)
        {
            throw ActionFailedException.Forbidden(ErrorCodes.Forbidden);
        }

        var client = clients.Read(command.ClientId, command.RedirectUri, AgentPolicy.TrustedOriginsOf(transaction.State));
        var user = current.Require(transaction.State);
        var now = time.GetUtcNow();
        var mine = transaction.State.Agents.Values.Where(a => a.UserId == user.Id).ToList();
        var replaced = mine.Where(a => a.ClientId == command.ClientId || AgentState.IsOver(a, now)).Select(a => a.Id).ToList();
        if (mine.Count - replaced.Count >= AgentLifetimes.MaxPerUser)
        {
            throw ActionFailedException.Conflict(ErrorCodes.AgentTooMany);
        }

        if (replaced.Count > 0)
        {
            transaction.Record(new AgentsRemoved(replaced));
        }

        var id = Guid.CreateVersion7(now);
        var code = grants.NewCode(id);
        var agent = new Agent(
            id,
            user.Id,
            client.Name,
            command.ClientId,
            command.RedirectUri,
            now,
            now,
            new AgentCode(SecretTokens.Hash(code), command.CodeChallenge, now + AgentLifetimes.Code),
            Tokens: null);
        transaction.Record(new AgentSaved(agent));
        transaction.Affects(agent.Id);
        var redirectTo = RedirectUris.WithQuery(command.RedirectUri, [new("code", code), new("state", command.State)]);
        return new(new ConnectedAgent(agent.Id, redirectTo));
    }
}
