using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.list", Description = "Lists the AI agents connected through MCP: yours, or everyone's for Administrators. A connection ends 90 days after it was approved.")]
[RequiresRole(Role.Viewer)]
public sealed record ListAgents : IQuery<IReadOnlyList<AgentView>>;
