using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class DeleteUserHandler(StateTransaction transaction, CurrentUser current) : ICommandHandler<DeleteUser>
{
    public ValueTask HandleAsync(DeleteUser command, CancellationToken ct = default)
    {
        var user = UserGuards.Find(transaction.State, command.Id);
        UserGuards.NotSelf(current, user);
        UserGuards.NotLastAdministrator(transaction.State, user);
        transaction.Record(new UserDeleted(user.Id));
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
