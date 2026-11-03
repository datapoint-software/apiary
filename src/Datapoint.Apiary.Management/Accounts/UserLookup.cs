using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;

namespace Datapoint.Apiary.Management.Accounts;

public static class UserLookup
{
    public static User? ByEmail(ApiaryState state, string email)
    {
        var normalized = Emails.Normalize(email);
        return state.Users.Values.FirstOrDefault(u => u.Email == normalized);
    }

    public static bool IsEmailTaken(ApiaryState state, string email, Guid? except = null) =>
        ByEmail(state, email) is { } user && user.Id != except;
}
