using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Stacks;

[StateSchema(2)]
public sealed record PipelineTokenRevoked(Guid TokenId) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { PipelineTokens = state.PipelineTokens.Remove(TokenId) };
}
