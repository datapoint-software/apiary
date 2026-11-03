namespace Datapoint.Apiary.Cluster.State;

public sealed record StateEntry(Guid RequestId, DateTimeOffset At, IReadOnlyList<IStateChange> Changes)
{
    public ApiaryState ApplyTo(ApiaryState state)
    {
        var next = state;
        foreach (var change in Changes)
        {
            next = change.Apply(next);
        }

        return next with { Index = state.Index + 1 };
    }
}
