using Datapoint.Apiary.Cluster.Sessions;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

public sealed class UpdateSessionPolicyHandler(StateTransaction transaction) : ICommandHandler<UpdateSessionPolicy>
{
    public ValueTask HandleAsync(UpdateSessionPolicy command, CancellationToken cancellationToken = default)
    {
        transaction.Record(new SessionPolicySaved(new SessionPolicy(command.IdleMinutes)));
        return ValueTask.CompletedTask;
    }
}
