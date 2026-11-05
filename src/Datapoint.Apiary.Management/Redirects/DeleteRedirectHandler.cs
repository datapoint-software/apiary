using Datapoint.Apiary.Cluster.Redirects;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Redirects;

public sealed class DeleteRedirectHandler(StateTransaction transaction) : ICommandHandler<DeleteRedirect>
{
    public ValueTask HandleAsync(DeleteRedirect command, CancellationToken ct = default)
    {
        if (!transaction.State.Redirects.TryGetValue(command.Id, out var redirect))
        {
            throw ActionFailedException.NotFound(ErrorCodes.RedirectNotFound);
        }

        if (redirect.Stack is not null)
        {
            throw ActionFailedException.Conflict(ErrorCodes.RedirectDeclaredInStack);
        }

        transaction.Record(new RedirectDeleted(redirect.Id));
        transaction.Affects(redirect.Id, redirect.ProjectId);
        return ValueTask.CompletedTask;
    }
}
