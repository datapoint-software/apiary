using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Agents;

[Action("agents.connect", "Approves an MCP client's request to act for you, and returns where to send your browser next.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record ConnectAgent(
    [property: Description("The client's id, from its registration.")] string ClientId,
    [property: Description("Where the client asks to be sent back.")] string RedirectUri,
    [property: Description("The PKCE code challenge.")] string CodeChallenge,
    [property: Description("The PKCE code challenge method. Only S256.")] string CodeChallengeMethod,
    [property: Description("The client's state, returned unchanged.")] string? State = null) : ICommand<ConnectedAgent>, IConfidentialResult;
