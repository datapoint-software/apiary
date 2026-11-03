using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Streams;

public sealed record StreamRouteDeleted(Guid StreamId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { StreamRoutes = state.StreamRoutes.Remove(StreamId) };
}
