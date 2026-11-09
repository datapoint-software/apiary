using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class DisableUserHandler(StateTransaction transaction, Sessions sessions, CurrentUser current) : ICommandHandler<DisableUser>
{
    public ValueTask HandleAsync(DisableUser command, CancellationToken cancellationToken = default)
    {
        var user = UserGuards.Find(transaction.State, command.Id);
        if (user.Status is not UserStatus.Active)
        {
            throw ActionFailedException.Conflict(ErrorCodes.Invalid);
        }

        UserGuards.NotSelf(current, user);
        UserGuards.NotLastAdministrator(transaction.State, user);
        transaction.Record(new UserSaved(user with { Status = UserStatus.Disabled }));
        sessions.EndAll(user.Id);
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
