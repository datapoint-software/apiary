using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Stacks;

[StateSchema(2)]
public sealed record PipelineTokenUsed(Guid TokenId, DateTimeOffset At) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) =>
        state.PipelineTokens.TryGetValue(TokenId, out var token)
            ? state with { PipelineTokens = state.PipelineTokens.SetItem(TokenId, token with { LastUsedAt = At }) }
            : state;
}
