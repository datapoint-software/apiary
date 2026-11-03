using Datapoint.Apiary.Management.Backups;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Setup;

public sealed class RestoreSetupHandler(StateTransaction transaction, SetupWindow window, BackupRestorer restorer)
    : ICommandHandler<RestoreSetup, RestoredBackup>
{
    public ValueTask<RestoredBackup> HandleAsync(RestoreSetup command, CancellationToken ct = default)
    {
        if (!window.IsOpen(transaction.State))
        {
            throw ActionFailedException.Forbidden(ErrorCodes.SetupClosed);
        }

        return new(restorer.Restore(command.Content));
    }
}
