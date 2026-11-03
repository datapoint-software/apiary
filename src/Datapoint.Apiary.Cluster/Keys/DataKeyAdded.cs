using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Keys;

public sealed record DataKeyAdded(SharedDataKey Key) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state;
}
