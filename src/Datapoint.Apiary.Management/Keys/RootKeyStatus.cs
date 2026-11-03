namespace Datapoint.Apiary.Management.Keys;

public sealed record RootKeyStatus(
    string Current,
    DateTimeOffset? CurrentSince,
    string? Target,
    DateTimeOffset? TargetSince,
    IReadOnlyList<ReplicaRootKey> Replicas);
