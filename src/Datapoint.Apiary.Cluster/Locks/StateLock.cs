namespace Datapoint.Apiary.Cluster.Locks;

public sealed record StateLock(string Name, string Holder, DateTimeOffset ExpiresAt);
