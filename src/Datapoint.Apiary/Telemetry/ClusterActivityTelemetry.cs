using System.Collections.Concurrent;
using System.Net;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Activity;
using Datapoint.Apiary.Proxy.Telemetry;

namespace Datapoint.Apiary.Telemetry;

public sealed partial class ClusterActivityTelemetry(RaftClusterState cluster, ClusterClient client, ProxyMetrics metrics, TimeProvider time, ILogger<ClusterActivityTelemetry> logger)
    : IActivityTelemetry
{
    public const string Path = "activity";
    private static readonly TimeSpan s_reuseFor = TimeSpan.FromSeconds(10);
    private readonly ConcurrentDictionary<ActivityRange, Reading> _readings = new();

    public ValueTask<ActivityView> ReadAsync(ActivityRange range, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        if (!_readings.TryGetValue(range, out var reading) || now - reading.At > s_reuseFor)
        {
            reading = new Reading(now, GatherAsync(ActivityWindow.For(range, now)));
            _readings[range] = reading;
        }

        return new(reading.Result.WaitAsync(cancellationToken));
    }

    private async Task<ActivityView> GatherAsync(ActivityWindow window)
    {
        var peers = await ReplicaPeers.ReachableAsync(cluster);
        var remote = await Task.WhenAll(peers.Select(peer => FetchAsync(peer, window)));
        var local = metrics.Activity.Read(window.UntilMinute, window.Points, window.Step);
        return ActivityMerger.Merge(window, [local, .. remote.OfType<IReadOnlyList<ActivitySample>>()]);
    }

    private async Task<IReadOnlyList<ActivitySample>?> FetchAsync(IPAddress peer, ActivityWindow window)
    {
        try
        {
            using var response = await client.GetAsync(peer, Path + "?" + window.Query, CancellationToken.None);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<List<ActivitySample>>(ApiJson.Options);
            }

            LogPeerRefused(logger, peer, (int)response.StatusCode);
            return null;
        }
        catch (Exception exception) when (exception is HttpRequestException or ClusterUnavailableException or OperationCanceledException)
        {
            LogPeerFailed(logger, peer, exception.Message);
            return null;
        }
    }

    private sealed record Reading(DateTimeOffset At, Task<ActivityView> Result);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Replica {Peer} answered {Status} when asked for its activity, so it isn't counted")]
    private static partial void LogPeerRefused(ILogger logger, IPAddress peer, int status);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't ask replica {Peer} for its activity, so it isn't counted: {Reason}")]
    private static partial void LogPeerFailed(ILogger logger, IPAddress peer, string reason);
}
