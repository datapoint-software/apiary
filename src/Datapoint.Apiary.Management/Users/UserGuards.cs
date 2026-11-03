using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;

namespace Datapoint.Apiary.Management.Users;

public static class UserGuards
{
    public static User Find(ApiaryState state, Guid id) =>
        state.Users.TryGetValue(id, out var user) ? user : throw ActionFailedException.NotFound(ErrorCodes.UserNotFound);

    public static void NotLastAdministrator(ApiaryState state, User user)
    {
        var isLast = user is { Role: Role.Administrator, Status: UserStatus.Active }
            && state.Users.Values.Count(u => u is { Role: Role.Administrator, Status: UserStatus.Active }) == 1;
        if (!isLast)
        {
            return;
        }

        throw ActionFailedException.Conflict(ErrorCodes.UserLastAdministrator);
    }

    public static void NotSelf(CurrentUser current, User user)
    {
        if (current.UserId != user.Id)
        {
            return;
        }

        throw ActionFailedException.Conflict(ErrorCodes.UserSelf);
    }
}
