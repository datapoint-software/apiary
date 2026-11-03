using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class UpdateAgentPolicyHandler(StateTransaction transaction) : ICommandHandler<UpdateAgentPolicy>
{
    public ValueTask HandleAsync(UpdateAgentPolicy command, CancellationToken ct = default)
    {
        var origins = command.TrustedOrigins.Select(RedirectUris.NormalizeOrigin).OfType<string>().Distinct(StringComparer.Ordinal).ToList();
        transaction.Record(new AgentPolicySaved(new AgentPolicy(origins)));
        var outside = transaction.State.Agents.Values.Where(a => !RedirectUris.IsAllowed(a.RedirectUri, origins)).Select(a => a.Id).ToList();
        if (outside.Count > 0)
        {
            transaction.Record(new AgentsRemoved(outside));
            foreach (var id in outside)
            {
                transaction.Affects(id);
            }
        }

        return ValueTask.CompletedTask;
    }
}
