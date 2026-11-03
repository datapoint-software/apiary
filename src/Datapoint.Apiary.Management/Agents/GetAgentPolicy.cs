using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.policy", "Lists the HTTPS origins, besides the user's own computer, that MCP clients may send the browser back to when connecting.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record GetAgentPolicy : IQuery<AgentPolicyView>;
