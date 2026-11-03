using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

public sealed class GetAgentClientHandler(AgentClients clients, IClusterState cluster) : IQueryHandler<GetAgentClient, AgentClientView>
{
    public ValueTask<AgentClientView> HandleAsync(GetAgentClient query, CancellationToken ct = default)
    {
        var client = clients.Read(query.ClientId, query.RedirectUri, AgentPolicy.TrustedOriginsOf(cluster.Current));
        var uri = new Uri(query.RedirectUri);
        return new(new AgentClientView(client.Name, query.RedirectUri, uri.Authority, RedirectUris.IsLoopback(uri)));
    }
}
