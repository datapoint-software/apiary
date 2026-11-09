using System.Globalization;
using Datapoint.Apiary.Cluster.Backups;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Backups;

public sealed class ExportBackupHandler(StateTransaction transaction, BackupSealer sealer, CurrentUser user, TimeProvider time)
    : ICommandHandler<ExportBackup, BackupFile>
{
    public ValueTask<BackupFile> HandleAsync(ExportBackup command, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var state = transaction.State;
        var content = sealer.Seal(BackupContent.From(state, now));
        var by = user.UserId is { } id && state.Users.TryGetValue(id, out var found) ? found.Email : null;
        transaction.Record(new BackupExported(new LastBackup(now, by, state.Index)));
        var name = string.Create(CultureInfo.InvariantCulture, $"apiary-{now:yyyy-MM-dd-HHmm}.backup");
        return new(new BackupFile(name, content, state.Index));
    }
}
