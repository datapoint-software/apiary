using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class RenewInviteHandler(StateTransaction transaction, Invitations invitations) : ICommandHandler<RenewInvite, InviteLink>
{
    public ValueTask<InviteLink> HandleAsync(RenewInvite command, CancellationToken ct = default)
    {
        var user = UserGuards.Find(transaction.State, command.Id);
        return user.Status is UserStatus.Invited
            ? new(invitations.Renew(user, Invitations.Lifetime))
            : throw ActionFailedException.Conflict(ErrorCodes.UserNotInvited);
    }
}
