using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Users;

public sealed record UserDeleted(Guid UserId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with
    {
        Users = state.Users.Remove(UserId),
        Sessions = state.Sessions.RemoveRange(state.Sessions.Values.Where(s => s.UserId == UserId).Select(s => s.Id)),
        Agents = state.Agents.RemoveRange(state.Agents.Values.Where(a => a.UserId == UserId).Select(a => a.Id)),
    };
}
