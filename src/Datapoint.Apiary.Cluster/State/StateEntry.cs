using System.Collections.Immutable;

namespace Datapoint.Apiary.Cluster.State;

public sealed record StateEntry(Guid RequestId, DateTimeOffset At, IReadOnlyList<IStateChange> Changes, string? Result = null)
{
    public static readonly TimeSpan RequestMemory = TimeSpan.FromMinutes(10);

    public ApiaryState ApplyTo(ApiaryState state, long index)
    {
        var next = state;
        foreach (var change in Changes)
        {
            next = change.Apply(next);
        }

        return next with { Index = index, AppliedRequests = Remember(next.AppliedRequests) };
    }

    private ImmutableDictionary<Guid, AppliedRequest> Remember(
        ImmutableDictionary<Guid, AppliedRequest> requests)
    {
        var forgotten = requests.Where(r => r.Value.At < At - RequestMemory).Select(r => r.Key);
        return requests.RemoveRange(forgotten).SetItem(RequestId, new AppliedRequest(At, Result));
    }
}
