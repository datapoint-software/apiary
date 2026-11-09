using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class RevokeAgentTokenHandler(StateTransaction transaction) : ICommandHandler<RevokeAgentToken, AgentRevocation>
{
    public ValueTask<AgentRevocation> HandleAsync(RevokeAgentToken command, CancellationToken cancellationToken = default)
    {
        var hash = SecretTokens.Hash(command.Token);
        var state = transaction.State;
        if (state.Agents.Values.FirstOrDefault(a => a.Tokens is { } t && (t.AccessHash == hash || t.RefreshHash == hash)) is not { } agent)
        {
            return new(AgentRevocation.Done);
        }

        if (agent.ClientId != command.ClientId)
        {
            return new(new AgentRevocation(AgentTokenResult.InvalidGrant));
        }

        transaction.Record(new AgentsRemoved([agent.Id]));
        transaction.ActingAs = state.Users.GetValueOrDefault(agent.UserId)?.Email;
        transaction.Affects(agent.Id);
        return new(AgentRevocation.Done);
    }
}
