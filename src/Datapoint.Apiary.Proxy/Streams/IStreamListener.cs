using Datapoint.Apiary.Cluster.Streams;

namespace Datapoint.Apiary.Proxy.Streams;

public interface IStreamListener : IAsyncDisposable
{
    void Update(IReadOnlyList<StreamRoute> routes);
}
