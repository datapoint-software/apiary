using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Invites;

public static class InviteTokens
{
    public static User Find(ApiaryState state, string token, DateTimeOffset now)
    {
        var hash = SecretTokens.Hash(token);
        return state.Users.Values.FirstOrDefault(u => u is { Status: UserStatus.Invited, Invite: { } invite } && invite.TokenHash == hash && invite.ExpiresAt > now)
            ?? throw ActionFailedException.NotFound(ErrorCodes.InviteInvalid);
    }
}
