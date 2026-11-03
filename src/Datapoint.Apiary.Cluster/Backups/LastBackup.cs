namespace Datapoint.Apiary.Cluster.Backups;

public sealed record LastBackup(DateTimeOffset At, string? By, long Index);
