using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

public sealed class RemoveReplicaHandler(RaftClusterState cluster, StateTransaction transaction, TimeProvider time) : ICommandHandler<RemoveReplica>
{
    public async ValueTask HandleAsync(RemoveReplica command, CancellationToken cancellationToken = default)
    {
        if (!transaction.State.Replicas.TryGetValue(command.Id, out var replica))
        {
            throw ActionFailedException.NotFound(ErrorCodes.ReplicaNotFound);
        }

        if (cluster.IsReachable(replica))
        {
            throw ActionFailedException.Conflict(ErrorCodes.ReplicaReachable);
        }

        await cluster.RemoveReplicaAsync(replica, cancellationToken);
        transaction.Record(new ReplicaRemoved(replica.Id, time.GetUtcNow()));
        transaction.Affects(replica.Id);
    }
}
