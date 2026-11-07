namespace Datapoint.Apiary.Cluster.Recovery;

public sealed record RecoveryPlan(
    bool Needed,
    string? Node,
    long Index,
    DateTimeOffset? LastChangeAt,
    IReadOnlyList<Survivor> Survivors,
    IReadOnlyList<string> Unreachable,
    IReadOnlyList<RecoveryUser> Users)
{
    // A replica without a majority can recover even if it never became ready: one that restarted after the
    // majority was lost never does. One cut off from replicas that still have a majority must not, or it
    // would replace their cluster.
    public static bool IsNeeded(bool inSwarm, bool hasState, bool writable, IReadOnlyList<Survivor> survivors) =>
        inSwarm && hasState && !writable && !survivors.Any(s => s.Writable);
}
