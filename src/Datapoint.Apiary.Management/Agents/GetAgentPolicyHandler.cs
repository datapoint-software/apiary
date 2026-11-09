using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class GetAgentPolicyHandler(IClusterState cluster) : IQueryHandler<GetAgentPolicy, AgentPolicyView>
{
    public ValueTask<AgentPolicyView> HandleAsync(GetAgentPolicy query, CancellationToken cancellationToken = default) =>
        new(new AgentPolicyView(AgentPolicy.TrustedOriginsOf(cluster.Current)));
}
