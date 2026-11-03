using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Agents;

[Action("oauth.token", Description = "The OAuth token endpoint for MCP clients: exchanges an authorization code or a refresh token for new tokens.")]
[AllowAnonymousAccess]
public sealed record IssueAgentToken(
    string GrantType,
    string? ClientId = null,
    string? Code = null,
    string? CodeVerifier = null,
    string? RedirectUri = null,
    string? RefreshToken = null) : ICommand<AgentTokenResult>, IConfidentialResult;
