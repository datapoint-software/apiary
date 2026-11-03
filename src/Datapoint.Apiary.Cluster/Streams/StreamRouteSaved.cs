using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Streams;

public sealed record StreamRouteSaved(StreamRoute Stream) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { StreamRoutes = state.StreamRoutes.SetItem(Stream.Id, Stream) };
}
