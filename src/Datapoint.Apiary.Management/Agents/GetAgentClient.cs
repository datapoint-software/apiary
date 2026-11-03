using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.client", Description = "Describes an MCP client that asks to connect, before you approve it.")]
[RequiresRole(Role.Viewer)]
public sealed record GetAgentClient(
    [property: Description("The client's id, from its registration.")] string ClientId,
    [property: Description("Where the client asks to be sent back.")] string RedirectUri) : IQuery<AgentClientView>;
