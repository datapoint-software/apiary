using System.Collections.Concurrent;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed class StreamConnections(TimeProvider time)
{
    private readonly ConcurrentDictionary<Guid, long> _open = new();
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> _lastOpened = new();

    public void Opened(Guid streamId)
    {
        _open.AddOrUpdate(streamId, 1, (_, count) => count + 1);
        _lastOpened[streamId] = time.GetUtcNow();
    }

    public void Closed(Guid streamId) => _open.AddOrUpdate(streamId, 0, (_, count) => Math.Max(0, count - 1));

    public long Count(Guid streamId) => _open.GetValueOrDefault(streamId);

    public DateTimeOffset? LastOpened(Guid streamId) => _lastOpened.TryGetValue(streamId, out var at) ? at : null;

    public void Forget(IReadOnlySet<Guid> keep)
    {
        foreach (var id in _open.Keys.Where(id => !keep.Contains(id) && _open[id] == 0))
        {
            _open.TryRemove(id, out _);
        }

        foreach (var id in _lastOpened.Keys.Where(id => !keep.Contains(id)))
        {
            _lastOpened.TryRemove(id, out _);
        }
    }
}
