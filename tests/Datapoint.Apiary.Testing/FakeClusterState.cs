using Datapoint.Apiary.Cluster.State;
using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Testing;

public sealed class FakeClusterState : IClusterState, IDisposable
{
    private readonly SemaphoreSlim _writes = new(1, 1);
    private readonly List<StateEntry> _entries = [];
    private CancellationTokenSource _changed = new();

    public ApiaryState Current { get; set; } = ApiaryState.Empty;

    public bool IsWritable { get; set; } = true;

    public bool IsLeader { get; set; } = true;

    public IReadOnlyList<StateEntry> Entries => _entries;

    public int ChangeTokenRequests { get; private set; }

    public IChangeToken GetChangeToken()
    {
        ChangeTokenRequests++;
        return new CancellationChangeToken(_changed.Token);
    }

    public async ValueTask<IDisposable> LockAsync(CancellationToken cancellationToken)
    {
        await _writes.WaitAsync(cancellationToken);
        return new Releaser(_writes);
    }

    public async ValueTask AppendAsync(StateEntry entry, CancellationToken cancellationToken)
    {
        if (!IsWritable)
        {
            throw new ClusterUnavailableException();
        }

        _entries.Add(entry);
        Current = entry.ApplyTo(Current, Current.Index + 1);
        var changed = Interlocked.Exchange(ref _changed, new CancellationTokenSource());
        await changed.CancelAsync();
        changed.Dispose();
    }

    public Task SyncAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public void Dispose()
    {
        _writes.Dispose();
        _changed.Dispose();
    }

    private sealed class Releaser(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }
}
