using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

public sealed class ApproveReplicaHandler(RaftClusterState cluster, StateTransaction transaction) : ICommandHandler<ApproveReplica>
{
    public ValueTask HandleAsync(ApproveReplica command, CancellationToken cancellationToken = default)
    {
        if (cluster.Pending.All(p => p.Id != command.Id))
        {
            throw ActionFailedException.NotFound(ErrorCodes.ReplicaNotPending);
        }

        transaction.Record(new ReplicaApproved(command.Id));
        transaction.Affects(command.Id);
        return ValueTask.CompletedTask;
    }
}
