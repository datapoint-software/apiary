using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Apiary.Security.Tokens;

namespace Datapoint.Apiary.Management.Accounts;

public sealed class Sessions(StateTransaction transaction, ISessionCookie cookie, IRequestOrigin origin, TimeProvider time)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(12);

    public void Start(User user)
    {
        var now = time.GetUtcNow();
        var token = SecretTokens.New();
        var expired = transaction.State.Sessions.Values.Where(s => s.UserId == user.Id && s.ExpiresAt <= now).Select(s => s.Id).ToList();
        if (expired.Count > 0)
        {
            transaction.Record(new SessionsEnded(expired));
        }

        var session = new Session(Guid.CreateVersion7(now), user.Id, SecretTokens.Hash(token), now, now + Lifetime, origin.Address, origin.Device);
        transaction.Record(new UserSaved(user with { LastSignInAt = now }));
        transaction.Record(new SessionStarted(session));
        transaction.ActingAs = user.Email;
        transaction.Affects(user.Id);
        cookie.Issue(token);
    }

    public void EndAll(Guid userId, Guid? except = null)
    {
        var ids = transaction.State.Sessions.Values.Where(s => s.UserId == userId && s.Id != except).Select(s => s.Id).ToList();
        if (ids.Count == 0)
        {
            return;
        }

        transaction.Record(new SessionsEnded(ids));
    }
}
