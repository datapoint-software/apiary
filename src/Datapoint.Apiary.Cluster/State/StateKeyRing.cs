namespace Datapoint.Apiary.Cluster.State;

public sealed record StateKeyRing(int Version, string Current, IReadOnlyList<WrappedDataKey> Keys);
