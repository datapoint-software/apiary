using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Stacks;

[StateSchema(2)]
public sealed record StackSaved(StackRecord Stack) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { Stacks = state.Stacks.SetItem(Stack.Name, Stack) };
}
