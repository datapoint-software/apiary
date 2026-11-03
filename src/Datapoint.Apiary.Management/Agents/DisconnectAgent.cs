using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.disconnect", "Disconnects an AI agent at once. It can connect again only if its user approves it again.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record DisconnectAgent([property: Description("The agent's id.")] Guid Id) : ICommand;
