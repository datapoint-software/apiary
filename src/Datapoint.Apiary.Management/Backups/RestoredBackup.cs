namespace Datapoint.Apiary.Management.Backups;

public sealed record RestoredBackup(DateTimeOffset TakenAt, int Routes, int Users, int Certificates);
