using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class DisconnectAgentHandler(StateTransaction transaction, CurrentUser current) : ICommandHandler<DisconnectAgent>
{
    public ValueTask HandleAsync(DisconnectAgent command, CancellationToken ct = default)
    {
        var user = current.Require(transaction.State);
        if (!transaction.State.Agents.TryGetValue(command.Id, out var agent) || (agent.UserId != user.Id && user.Role is not Role.Administrator))
        {
            throw ActionFailedException.NotFound(ErrorCodes.AgentNotFound);
        }

        transaction.Record(new AgentsRemoved([agent.Id]));
        transaction.Affects(agent.Id);
        return ValueTask.CompletedTask;
    }
}
