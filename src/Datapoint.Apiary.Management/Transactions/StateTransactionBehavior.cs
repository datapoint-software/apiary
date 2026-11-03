using System.Collections.Concurrent;
using System.Reflection;
using System.Security.Claims;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Transactions;

public sealed class StateTransactionBehavior(
    IClusterState cluster,
    StateTransaction transaction,
    IPrincipalAccessor principals,
    IRequestOrigin origin,
    TimeProvider time) : IBehavior
{
    private static readonly ConcurrentDictionary<Type, string> s_actionNames = new();

    public async ValueTask HandleAsync(ICommand command, Func<CancellationToken, ValueTask> next, CancellationToken ct = default)
    {
        EnsureWritable();
        await next(ct);
        await CommitAsync(command, ct);
    }

    public async ValueTask<TResult> HandleAsync<TResult>(
        ICommand<TResult> command, Func<CancellationToken, ValueTask<TResult>> next, CancellationToken ct = default)
    {
        EnsureWritable();
        var result = await next(ct);
        await CommitAsync(command, ct);
        return result;
    }

    public static string ActionName(Type type) =>
        s_actionNames.GetOrAdd(type, t => t.GetCustomAttribute<ActionAttribute>()?.Name ?? t.Name);

    private void EnsureWritable()
    {
        if (cluster.IsWritable)
        {
            return;
        }

        throw new ActionFailedException(ErrorCodes.NoQuorum, FailureKind.Unavailable);
    }

    private async ValueTask CommitAsync(object command, CancellationToken ct)
    {
        if (transaction.Changes.Count == 0)
        {
            return;
        }

        var now = time.GetUtcNow();
        var audit = new AuditRecorded(new AuditEntry(
            Guid.CreateVersion7(now),
            now,
            transaction.ActingAs ?? principals.Principal?.FindFirstValue(ClaimTypes.Name),
            origin.Client,
            origin.Address,
            ActionName(command.GetType()),
            transaction.Affected,
            transaction.ProjectId,
            AuditOutcome.Succeeded));
        var entry = new StateEntry(Guid.CreateVersion7(now), now, [.. transaction.Changes, audit]);
        await cluster.AppendAsync(entry, ct);
    }
}
