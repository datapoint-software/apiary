using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Cluster.Trust;

public sealed partial class ClusterCaRotation(
    RaftClusterState cluster,
    IOptions<ClusterOptions> options,
    TimeProvider time,
    ILogger<ClusterCaRotation> logger) : BackgroundService
{
    public const string RotateAction = "cluster.rotate-ca";
    private static readonly TimeSpan s_maximumInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = options.Value.ClusterCaOverlap / 10 < s_maximumInterval ? options.Value.ClusterCaOverlap / 10 : s_maximumInterval;
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(interval, time, stoppingToken);
            try
            {
                cluster.RefreshCredentials();
                await AdvanceAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                LogRotationFailed(exception);
            }
        }
    }

    private async Task AdvanceAsync(CancellationToken cancellationToken)
    {
        var state = cluster.Current;
        if (!cluster.IsLeader || !cluster.IsWritable || state.ClusterCa is not { } ca)
        {
            return;
        }

        var now = time.GetUtcNow();
        var settled = state.ClusterCaChangedAt is not { } changedAt || now - changedAt >= options.Value.ClusterCaOverlap;
        IStateChange? change = (state.NextClusterCa, state.RetiringClusterCa) switch
        {
            (not null, _) when settled => new ClusterCaPromoted(now),
            (null, not null) when settled => new ClusterCaRetired(now),
            (null, null) when ca.NotAfter - now < options.Value.ClusterCaRenewBefore => new ClusterCaAdded(ClusterAuthority.Create(now), now),
            _ => null,
        };
        if (change is null)
        {
            return;
        }

        IStateChange[] changes = change is ClusterCaAdded
            ? [change, new AuditRecorded(new AuditEntry(Guid.CreateVersion7(now), now, null, "System", null, RotateAction, [], null, AuditOutcome.Succeeded))]
            : [change];
        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, changes), cancellationToken);
        LogAdvanced(change.GetType().Name);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Cluster CA rotation: {Step}")]
    private partial void LogAdvanced(string step);

    [LoggerMessage(Level = LogLevel.Error, Message = "Couldn't check the cluster CA and this replica's certificate")]
    private partial void LogRotationFailed(Exception exception);
}
