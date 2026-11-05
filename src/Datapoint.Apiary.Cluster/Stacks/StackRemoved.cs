using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Stacks;

[StateSchema(2)]
public sealed record StackRemoved(string Name) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with
    {
        Stacks = state.Stacks.Remove(Name),
        PipelineTokens = state.PipelineTokens.RemoveRange(state.PipelineTokens.Values.Where(t => t.Stack == Name).Select(t => t.Id)),
    };
}
