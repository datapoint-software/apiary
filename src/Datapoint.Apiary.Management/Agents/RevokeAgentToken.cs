using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Agents;

[Action("oauth.revoke", Description = "The OAuth revocation endpoint for MCP clients: disconnects the agent that holds the token. Refuses a token issued to another client with invalid_grant.")]
[AllowAnonymousAccess]
public sealed record RevokeAgentToken(string Token, string ClientId) : ICommand<AgentRevocation>;
