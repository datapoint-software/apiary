using System.Net;
using Datapoint.Apiary.Api;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Raft;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Apiary.Proxy.Telemetry;

namespace Datapoint.Apiary.Telemetry;

public sealed class ClusterRouteTelemetry(RaftClusterState cluster, ClusterClient client, RouteTelemetrySource local, TimeProvider time)
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
        var peers = cluster.Describe().Members
            .Where(m => !m.Local && m.Reachable)
            .Select(m => IPEndPoint.TryParse(m.Address, out var endpoint) ? endpoint.Address : null)
            .OfType<IPAddress>();
        var remote = await Task.WhenAll(peers.Select(FetchAsync));
        return RouteTelemetryMerger.Merge([local.Snapshot(), .. remote.OfType<IReadOnlyList<RouteSnapshot>>()]);
    }

    private async Task<IReadOnlyList<RouteSnapshot>?> FetchAsync(IPAddress peer)
    {
        try
        {
            using var response = await client.GetAsync(peer, Path, CancellationToken.None);
            return response.IsSuccessStatusCode
                ? await response.Content.ReadFromJsonAsync<List<RouteSnapshot>>(ApiJson.Options)
                : null;
        }
        catch (Exception exception) when (exception is HttpRequestException or ClusterUnavailableException or OperationCanceledException)
        {
            return null;
        }
    }

    private sealed record Reading(DateTimeOffset At, Task<IReadOnlyDictionary<Guid, RouteTelemetry>> Result);
}
