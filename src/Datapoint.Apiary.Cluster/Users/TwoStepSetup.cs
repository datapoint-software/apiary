namespace Datapoint.Apiary.Cluster.Users;

public sealed record TwoStepSetup(string Secret, DateTimeOffset SetUpAt, long LastUsedStep, IReadOnlyList<string> RecoveryCodeHashes);
