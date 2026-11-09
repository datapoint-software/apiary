using System.Collections.Concurrent;
using System.Reflection;
using System.Security.Claims;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Telemetry;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Transactions;

public sealed class StateTransactionBehavior(
    IClusterState cluster,
    StateTransaction transaction,
    IPrincipalAccessor principals,
    IRequestOrigin origin,
    ICommandForwarder forwarder,
    ForwardedRequest forwarded,
    ClusterMetrics metrics,
    TimeProvider time) : IBehavior
{
    private const int MaxRememberedResult = 16 * 1024;
    private static readonly ConcurrentDictionary<Type, string> s_actionNames = new();

    public async ValueTask HandleAsync(ICommand command, Func<CancellationToken, ValueTask> next, CancellationToken cancellationToken = default)
    {
        if (!cluster.IsLeader)
        {
            await forwarder.ForwardAsync(command, cancellationToken);
            return;
        }

        using var write = await cluster.LockAsync(cancellationToken);
        EnsureWritable();
        await next(cancellationToken);
        await CommitAsync(command, null, AuditOutcome.Succeeded, cancellationToken);
    }

    public async ValueTask<TResult> HandleAsync<TResult>(
        ICommand<TResult> command, Func<CancellationToken, ValueTask<TResult>> next, CancellationToken cancellationToken = default)
    {
        if (!cluster.IsLeader)
        {
            return await forwarder.ForwardAsync(command, cancellationToken);
        }

        if (command is ISelfCommitting)
        {
            EnsureWritable();
            return await next(cancellationToken);
        }

        using var write = await cluster.LockAsync(cancellationToken);
        EnsureWritable();
        TResult result;
        try
        {
            result = await next(cancellationToken);
        }
        catch (ActionFailedException failed) when (failed.KeepsChanges)
        {
            await CommitAsync(command, null, AuditOutcome.Failed, cancellationToken);
            throw;
        }

        await CommitAsync(command, forwarded.RequestId is null || command is IConfidentialResult ? null : Remembered(forwarder.Serialize(result)), AuditOutcome.Succeeded, cancellationToken);
        return result;
    }

    public static string ActionName(Type type) =>
        s_actionNames.GetOrAdd(type, t => t.GetCustomAttribute<ActionAttribute>()?.Name ?? t.Name);

    private static string? Remembered(string? result) => result is { Length: <= MaxRememberedResult } ? result : null;

    private void EnsureWritable()
    {
        if (cluster.IsWritable)
        {
            return;
        }

        metrics.WriteFailed(ErrorCodes.NoQuorum);
        throw new ActionFailedException(ErrorCodes.NoQuorum, FailureKind.Unavailable);
    }

    private async ValueTask CommitAsync(object command, string? result, AuditOutcome outcome, CancellationToken cancellationToken)
    {
        if (transaction.Changes.Count == 0)
        {
            return;
        }

        var now = time.GetUtcNow();
        var entry = new StateEntry(forwarded.RequestId ?? Guid.CreateVersion7(now), now, [.. transaction.Changes, .. Audit(command, outcome, now)], result);
        try
        {
            await cluster.AppendAsync(entry, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            metrics.WriteFailed(exception.GetType().Name);
            throw;
        }
    }

    private Guid? UserIdOf(string? user)
    {
        if (transaction.ActingAs is null && Guid.TryParse(principals.Principal?.FindFirstValue(ApiaryClaims.UserId), out var id))
        {
            return id;
        }

        return user is null ? null : UserLookup.ByEmail(cluster.Current, user)?.Id;
    }

    private IEnumerable<IStateChange> Audit(object command, AuditOutcome outcome, DateTimeOffset now)
    {
        if (transaction.Unaudited)
        {
            yield break;
        }

        var user = transaction.ActingAs ?? principals.Principal?.FindFirstValue(ClaimTypes.Name);
        yield return new AuditRecorded(new AuditEntry(
            Guid.CreateVersion7(now),
            now,
            user,
            origin.Client,
            origin.Address,
            ActionName(command.GetType()),
            transaction.Affected,
            transaction.ProjectId,
            outcome,
            UserIdOf(user),
            principals.Principal?.FindFirstValue(ApiaryClaims.Pipeline)));
    }
}
