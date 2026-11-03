using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Proxy.Caching;

public sealed class RouteCacheEvictor(IClusterState cluster, IOutputCacheStore store) : IHostedService, IDisposable
{
    private IReadOnlyDictionary<Guid, Route> _routes = new Dictionary<Guid, Route>();
    private IDisposable? _subscription;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _routes = cluster.Current.Routes;
        _subscription = ChangeToken.OnChange(cluster.GetChangeToken, Evict);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _subscription?.Dispose();
        return Task.CompletedTask;
    }

    public void Dispose() => _subscription?.Dispose();

    private void Evict()
    {
        var current = cluster.Current.Routes;
        var previous = Interlocked.Exchange(ref _routes, current);
        foreach (var (id, route) in previous)
        {
            if (route.Caching && (!current.TryGetValue(id, out var now) || !ReferenceEquals(now, route)))
            {
                _ = store.EvictByTagAsync(id.ToString(), CancellationToken.None).AsTask();
            }
        }
    }
}
