using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.update-policy", "Sets the HTTPS origins, besides the user's own computer, that MCP clients may send the browser back to when connecting, such as a web-based agent on the internal network. Agents that return anywhere else are disconnected.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record UpdateAgentPolicy(
    [property: Description("HTTPS origins, such as https://agents.example.com, without a path. At most 20. An empty list allows only the user's own computer.")] IReadOnlyList<string> TrustedOrigins) : ICommand;
