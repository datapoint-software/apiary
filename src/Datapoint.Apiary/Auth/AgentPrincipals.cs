using System.Security.Claims;
using Datapoint.Apiary.Cluster.Agents;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Auth;

public static class AgentPrincipals
{
    public static ClaimsPrincipal? Create(ApiaryState state, Agent? agent, DateTimeOffset now, string authenticationType)
    {
        if (agent?.Tokens is not { } tokens
            || tokens.AccessExpiresAt <= now
            || !state.Users.TryGetValue(agent.UserId, out var user)
            || user.Status is not UserStatus.Active)
        {
            return null;
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ApiaryClaims.UserId, user.Id.ToString()),
                new Claim(ApiaryClaims.Email, user.Email),
                new Claim(ApiaryClaims.Role, user.Role.ToString()),
                new Claim(ApiaryClaims.AgentId, agent.Id.ToString()),
                new Claim(ApiaryClaims.Client, agent.Name),
            ],
            authenticationType);
        return new ClaimsPrincipal(identity);
    }
}
