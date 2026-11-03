namespace Datapoint.Apiary.Management.Backups;

public sealed record BackupFile(string Name, string Content, long Index);
