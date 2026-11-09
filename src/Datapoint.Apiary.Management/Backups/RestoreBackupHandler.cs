using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Backups;

public sealed class RestoreBackupHandler(BackupRestorer restorer, ISessionCookie cookie) : ICommandHandler<RestoreBackup, RestoredBackup>
{
    public ValueTask<RestoredBackup> HandleAsync(RestoreBackup command, CancellationToken cancellationToken = default)
    {
        var restored = restorer.Restore(command.Content);
        cookie.Clear();
        return new(restored);
    }
}
