namespace Datapoint.Apiary.Cluster.Recovery;

public sealed record RecoveryRequest(DateTimeOffset RequestedAt, long Index);
