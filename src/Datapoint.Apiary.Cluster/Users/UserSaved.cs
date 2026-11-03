using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Users;

public sealed record UserSaved(User User) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Users = state.Users.SetItem(User.Id, User) };
}
