namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record PendingReplica(Guid Id, string Node, string Address, DateTimeOffset Since, DateTimeOffset LastSeen);
