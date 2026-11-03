using System.Security.Claims;
using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Auth;

public static class SessionPrincipals
{
    public static ClaimsPrincipal? Create(ApiaryState state, Session? session, DateTimeOffset now, string authenticationType)
    {
        if (session is null
            || session.ExpiresAt <= now
            || !state.Users.TryGetValue(session.UserId, out var user)
            || user.Status is not UserStatus.Active)
        {
            return null;
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ApiaryClaims.UserId, user.Id.ToString()),
                new Claim(ApiaryClaims.Email, user.Email),
                new Claim(ApiaryClaims.Role, user.Role.ToString()),
                new Claim(ApiaryClaims.SessionId, session.Id.ToString()),
            ],
            authenticationType);
        return new ClaimsPrincipal(identity);
    }
}
