using System.Net;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Proxy.Telemetry;

namespace Datapoint.Apiary.Telemetry;

public sealed partial class ClusterRouteTelemetry(RaftClusterState cluster, ClusterClient client, RouteTelemetrySource local, TimeProvider time, ILogger<ClusterRouteTelemetry> logger)
    : IRouteTelemetry
{
    public const string Path = "routes";
    private static readonly TimeSpan s_reuseFor = TimeSpan.FromSeconds(5);
    private Reading? _reading;

    public ValueTask<IReadOnlyDictionary<Guid, RouteTelemetry>> ReadAsync(CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var reading = _reading;
        if (reading is null || now - reading.At > s_reuseFor)
        {
            reading = new Reading(now, GatherAsync());
            _reading = reading;
        }

        return new(reading.Result.WaitAsync(cancellationToken));
    }

    private async Task<IReadOnlyDictionary<Guid, RouteTelemetry>> GatherAsync()
    {
        var peers = await ReplicaPeers.ReachableAsync(cluster);
        var remote = await Task.WhenAll(peers.Select(FetchAsync));
        return RouteTelemetryMerger.Merge([local.Snapshot(), .. remote.OfType<IReadOnlyList<RouteSnapshot>>()]);
    }

    private async Task<IReadOnlyList<RouteSnapshot>?> FetchAsync(IPAddress peer)
    {
        try
        {
            using var response = await client.GetAsync(peer, Path, CancellationToken.None);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<List<RouteSnapshot>>(ApiJson.Options);
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

    private sealed record Reading(DateTimeOffset At, Task<IReadOnlyDictionary<Guid, RouteTelemetry>> Result);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Replica {Peer} answered {Status} when asked for its route telemetry, so it isn't counted")]
    private static partial void LogPeerRefused(ILogger logger, IPAddress peer, int status);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Couldn't ask replica {Peer} for its route telemetry, so it isn't counted: {Reason}")]
    private static partial void LogPeerFailed(ILogger logger, IPAddress peer, string reason);
}
