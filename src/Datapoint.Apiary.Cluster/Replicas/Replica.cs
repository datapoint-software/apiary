namespace Datapoint.Apiary.Cluster.Replicas;

public sealed record Replica(Guid Id, string Node, string Address, DateTimeOffset JoinedAt, int? Schema = null, string? RootKeyId = null);
