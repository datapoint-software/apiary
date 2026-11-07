namespace Datapoint.Apiary.Cluster.Recovery;

public sealed record Survivor(string? Node, string Address, long Index, bool Writable = false);
