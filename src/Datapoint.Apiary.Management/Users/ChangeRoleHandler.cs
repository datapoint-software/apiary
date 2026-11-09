using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class ChangeRoleHandler(StateTransaction transaction) : ICommandHandler<ChangeRole>
{
    public ValueTask HandleAsync(ChangeRole command, CancellationToken cancellationToken = default)
    {
        var user = UserGuards.Find(transaction.State, command.Id);
        UserGuards.NotManagedBySso(user);
        if (user.Role == command.Role)
        {
            throw FieldErrors.For(nameof(ChangeRole.Role), ErrorCodes.UserSameRole);
        }

        UserGuards.NotLastAdministrator(transaction.State, user);
        transaction.Record(new UserSaved(user with { Role = command.Role }));
        transaction.Affects(user.Id);
        return ValueTask.CompletedTask;
    }
}
