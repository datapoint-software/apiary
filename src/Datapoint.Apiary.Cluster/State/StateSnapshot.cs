namespace Datapoint.Apiary.Cluster.State;

public sealed record StateSnapshot(int Version, ApiaryState State);
