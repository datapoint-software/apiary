using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Backups;

public sealed class GetBackupStatusHandler(IClusterState cluster) : IQueryHandler<GetBackupStatus, BackupStatus>
{
    private const string ExportAction = "backups.export";

    public ValueTask<BackupStatus> HandleAsync(GetBackupStatus query, CancellationToken cancellationToken = default)
    {
        var state = cluster.Current;
        var last = state.LastBackup;
        return new(new BackupStatus(last?.At, last?.By, last is null ? state.Audit.Count : state.Audit.Count(a => a.At > last.At && a.Action != ExportAction)));
    }
}
