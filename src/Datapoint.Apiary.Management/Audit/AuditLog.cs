using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Transactions;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Management.Audit;

public sealed partial class AuditLog(IClusterState cluster, IRequestOrigin origin, TimeProvider time, ILogger<AuditLog> logger)
{
    public async ValueTask RecordAsync(string action, AuditOutcome outcome, string? user, IReadOnlyList<string> affected, CancellationToken ct)
    {
        if (!cluster.IsWritable)
        {
            LogNotRecorded(action, outcome);
            return;
        }

        var now = time.GetUtcNow();
        var entry = new AuditEntry(Guid.CreateVersion7(now), now, user, origin.Client, origin.Address, action, affected, ProjectId: null, outcome);
        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, [new AuditRecorded(entry)]), ct);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "The audit entry for {Action} ({Outcome}) wasn't recorded: the cluster can't take writes.")]
    private partial void LogNotRecorded(string action, AuditOutcome outcome);
}
