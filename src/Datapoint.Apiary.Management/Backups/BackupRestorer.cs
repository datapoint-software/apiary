using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;

namespace Datapoint.Apiary.Management.Backups;

public sealed class BackupRestorer(StateTransaction transaction, BackupSealer sealer)
{
    public const int MaxLength = 25 * 1024 * 1024;

    public RestoredBackup Restore(string content)
    {
        var backup = (content.Length <= MaxLength ? sealer.Open(content) : null)
            ?? throw FieldErrors.For(nameof(RestoreBackup.Content), ErrorCodes.BackupUnreadable);
        transaction.Record(new StateRestored(backup.State));
        return new RestoredBackup(backup.TakenAt, backup.State.Routes.Count, backup.State.Users.Count, backup.State.Certificates.Count);
    }
}
