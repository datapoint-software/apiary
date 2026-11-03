namespace Datapoint.Apiary.Cluster.State;

public sealed record SharedKeyRing(string Current, IReadOnlyList<SharedDataKey> Keys);
