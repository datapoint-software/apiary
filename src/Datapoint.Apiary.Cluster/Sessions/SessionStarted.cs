using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Sessions;

public sealed record SessionStarted(Session Session) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Sessions = state.Sessions.SetItem(Session.Id, Session) };
}
