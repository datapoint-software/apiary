namespace Datapoint.Apiary.Cluster.Recovery;

public sealed record RecoveryPlan(
    bool Needed,
    string? Node,
    long Index,
    DateTimeOffset? LastChangeAt,
    IReadOnlyList<Survivor> Survivors,
    IReadOnlyList<string> Unreachable,
    IReadOnlyList<RecoveryUser> Users);
