using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Replicas;

public sealed class RemoveReplicaHandler(RaftClusterState cluster, StateTransaction transaction) : ICommandHandler<RemoveReplica>
{
    public async ValueTask HandleAsync(RemoveReplica command, CancellationToken ct = default)
    {
        if (!transaction.State.Replicas.TryGetValue(command.Id, out var replica))
        {
            throw ActionFailedException.NotFound(ErrorCodes.ReplicaNotFound);
        }

        if (cluster.IsReachable(replica))
        {
            throw ActionFailedException.Conflict(ErrorCodes.ReplicaReachable);
        }

        await cluster.RemoveReplicaAsync(replica, ct);
        transaction.Record(new ReplicaRemoved(replica.Id));
        transaction.Affects(replica.Id);
    }
}
