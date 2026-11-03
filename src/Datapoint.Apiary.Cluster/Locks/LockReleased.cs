using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Locks;

public sealed record LockReleased(string Name, string Holder) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state.Locks.TryGetValue(Name, out var held) && held.Holder == Holder
            ? state with { Locks = state.Locks.Remove(Name) }
            : state;
}
