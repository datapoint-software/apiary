using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.disconnect", Description = "Disconnects an AI agent at once. It can connect again only if its user approves it again.")]
[RequiresRole(Role.Viewer)]
public sealed record DisconnectAgent([property: Description("The agent's id.")] Guid Id) : ICommand;
