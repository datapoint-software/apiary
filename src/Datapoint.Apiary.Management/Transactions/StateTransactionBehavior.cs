using System.Collections.Concurrent;
using System.Reflection;
using System.Security.Claims;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Telemetry;
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

    public async ValueTask HandleAsync(ICommand command, Func<CancellationToken, ValueTask> next, CancellationToken ct = default)
    {
        if (!cluster.IsLeader)
        {
            await forwarder.ForwardAsync(command, ct);
            return;
        }

        using var write = await cluster.LockAsync(ct);
        EnsureWritable();
        await next(ct);
        await CommitAsync(command, null, ct);
    }

    public async ValueTask<TResult> HandleAsync<TResult>(
        ICommand<TResult> command, Func<CancellationToken, ValueTask<TResult>> next, CancellationToken ct = default)
    {
        if (!cluster.IsLeader)
        {
            return await forwarder.ForwardAsync(command, ct);
        }

        using var write = await cluster.LockAsync(ct);
        EnsureWritable();
        var result = await next(ct);
        await CommitAsync(command, forwarded.RequestId is null || command is IConfidentialResult ? null : Remembered(forwarder.Serialize(result)), ct);
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

    private async ValueTask CommitAsync(object command, string? result, CancellationToken ct)
    {
        if (transaction.Changes.Count == 0)
        {
            return;
        }

        var now = time.GetUtcNow();
        var entry = new StateEntry(forwarded.RequestId ?? Guid.CreateVersion7(now), now, [.. transaction.Changes, .. Audit(command, now)], result);
        try
        {
            await cluster.AppendAsync(entry, ct);
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            metrics.WriteFailed(exception.GetType().Name);
            throw;
        }
    }

    private IEnumerable<IStateChange> Audit(object command, DateTimeOffset now)
    {
        if (transaction.Unaudited)
        {
            yield break;
        }

        yield return new AuditRecorded(new AuditEntry(
            Guid.CreateVersion7(now),
            now,
            transaction.ActingAs ?? principals.Principal?.FindFirstValue(ClaimTypes.Name),
            origin.Client,
            origin.Address,
            ActionName(command.GetType()),
            transaction.Affected,
            transaction.ProjectId,
            AuditOutcome.Succeeded));
    }
}
