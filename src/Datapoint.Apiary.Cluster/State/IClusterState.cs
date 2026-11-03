using Microsoft.Extensions.Primitives;

namespace Datapoint.Apiary.Cluster.State;

public interface IClusterState
{
    ApiaryState Current { get; }

    bool IsWritable { get; }

    IChangeToken GetChangeToken();

    ValueTask AppendAsync(StateEntry entry, CancellationToken cancellationToken);
}
