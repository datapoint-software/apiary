using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Backups;

public sealed record BackupExported(LastBackup Backup) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { LastBackup = Backup };
}
