using System.Collections.Concurrent;

namespace Datapoint.Apiary.Proxy.Streams;

public sealed class StreamConnections
{
    private readonly ConcurrentDictionary<Guid, long> _open = new();

    public void Opened(Guid streamId) => _open.AddOrUpdate(streamId, 1, (_, count) => count + 1);

    public void Closed(Guid streamId) => _open.AddOrUpdate(streamId, 0, (_, count) => Math.Max(0, count - 1));

    public long Count(Guid streamId) => _open.GetValueOrDefault(streamId);

    public void Forget(IReadOnlySet<Guid> keep)
    {
        foreach (var id in _open.Keys.Where(id => !keep.Contains(id) && _open[id] == 0))
        {
            _open.TryRemove(id, out _);
        }
    }
}
