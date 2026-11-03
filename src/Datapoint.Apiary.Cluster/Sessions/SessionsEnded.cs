using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Sessions;

public sealed record SessionsEnded(IReadOnlyList<Guid> SessionIds) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Sessions = state.Sessions.RemoveRange(SessionIds) };
}
