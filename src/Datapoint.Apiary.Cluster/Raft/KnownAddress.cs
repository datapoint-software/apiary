namespace Datapoint.Apiary.Cluster.Raft;

public sealed record KnownAddress(string Address, Guid ReplicaId, DateTimeOffset SeenAt);
