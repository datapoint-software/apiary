using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Cluster.State;

public interface IClusterState
{
    ApiaryState Current { get; }

    bool IsWritable { get; }

    bool IsLeader { get; }

    IChangeToken GetChangeToken();

    ValueTask<IDisposable> LockAsync(CancellationToken cancellationToken);

    ValueTask AppendAsync(StateEntry entry, CancellationToken cancellationToken);

    Task SyncAsync(CancellationToken cancellationToken);
}
