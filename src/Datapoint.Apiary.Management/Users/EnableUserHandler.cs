using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class EnableUserHandler(StateTransaction transaction) : ICommandHandler<EnableUser>
{
    public ValueTask HandleAsync(EnableUser command, CancellationToken ct = default)
    {
        var user = UserGuards.Find(transaction.State, command.Id);
        if (user.Status is not UserStatus.Disabled)
        {
            throw ActionFailedException.Conflict(ErrorCodes.Invalid);
        }

        transaction.Record(new UserSaved(user with { Status = UserStatus.Active }));
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
