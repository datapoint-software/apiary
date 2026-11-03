namespace Datapoint.Apiary.Management.Backups;

public sealed record BackupStatus(DateTimeOffset? LastAt, string? LastBy, long ChangesSince);
