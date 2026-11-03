using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Keys;

public sealed record RootKeyRegistered(JoinKeys Keys, DateTimeOffset At) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state.RootKeys.Any(k => k.Keys.RootKeyId == Keys.RootKeyId)
        ? state
        : state with { RootKeys = state.RootKeys.Add(new RegisteredRootKey(Keys, At)) };
}
