using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

public sealed class UpdateMembershipHandler(StateTransaction transaction) : ICommandHandler<UpdateMembership>
{
    public ValueTask HandleAsync(UpdateMembership command, CancellationToken cancellationToken = default)
    {
        transaction.Record(new MembershipChanged(new MembershipSettings(command.Mode, command.RemoveMissingAfterMinutes)));
        return ValueTask.CompletedTask;
    }
}
