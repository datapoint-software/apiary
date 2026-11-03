using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Users;

public sealed class Invitations(StateTransaction transaction, TimeProvider time)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(72);

    public InviteLink Create(string name, string email, Role role, TimeSpan lifetime)
    {
        var now = time.GetUtcNow();
        var user = new User(Guid.CreateVersion7(now), name.Trim(), email, role, UserStatus.Invited, null, null, null, now, null);
        return Renew(user, lifetime);
    }

    public InviteLink Renew(User user, TimeSpan lifetime)
    {
        var token = SecretTokens.New();
        var invite = new Invite(SecretTokens.Hash(token), time.GetUtcNow() + lifetime);
        transaction.Record(new UserSaved(user with { Invite = invite }));
        transaction.Affects(user.Id);
        return new InviteLink(user.Id, token, invite.ExpiresAt);
    }
}
