using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Users;

public sealed record SetupCompleted : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { SetupCompleted = true };
}
