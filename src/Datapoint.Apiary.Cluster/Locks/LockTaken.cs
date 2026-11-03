using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Locks;

public sealed record LockTaken(StateLock Lock, DateTimeOffset At) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state.Locks.TryGetValue(Lock.Name, out var held) && held.Holder != Lock.Holder && held.ExpiresAt > At
            ? state
            : state with { Locks = state.Locks.SetItem(Lock.Name, Lock) };
}
