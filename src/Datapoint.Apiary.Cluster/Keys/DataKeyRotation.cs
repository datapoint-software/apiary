using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Datapoint.Apiary.Cluster.Keys;

public sealed partial class DataKeyRotation(
    IClusterState cluster,
    StateEncryption encryption,
    IOptions<ClusterOptions> options,
    TimeProvider time,
    ILogger<DataKeyRotation> logger) : BackgroundService
{
    public const string RotateAction = "keys.rotate-data-key";
    private static readonly TimeSpan s_maximumInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(Min(s_maximumInterval, options.Value.DataKeyLifetime / 10), time, stoppingToken);
            try
            {
                await RotateIfDueAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                LogRotationFailed(exception);
            }
        }
    }

    private async Task RotateIfDueAsync(CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        if (!cluster.IsLeader || !cluster.IsWritable || encryption.CurrentCreatedAt is not { } createdAt || now - createdAt < options.Value.DataKeyLifetime)
        {
            return;
        }

        var key = StateEncryption.NewDataKey(now);
        var audit = new AuditEntry(Guid.CreateVersion7(now), now, null, "System", null, RotateAction, [key.Id], null, AuditOutcome.Succeeded);
        await cluster.AppendAsync(new StateEntry(Guid.CreateVersion7(now), now, [new DataKeyAdded(key), new AuditRecorded(audit)]), cancellationToken);
        LogRotated(key.Id);
    }

    private static TimeSpan Min(TimeSpan a, TimeSpan b) => a < b ? a : b;

    [LoggerMessage(Level = LogLevel.Information, Message = "Started using a new data key, {Id}, for the state at rest")]
    private partial void LogRotated(string id);

    [LoggerMessage(Level = LogLevel.Error, Message = "Couldn't rotate the data key")]
    private partial void LogRotationFailed(Exception exception);
}
