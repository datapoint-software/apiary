namespace Datapoint.Apiary.Cluster.State;

public sealed record WrappedDataKey(string Id, DateTimeOffset CreatedAt, string Key);
