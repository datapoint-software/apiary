using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Cluster.Stacks;

[StateSchema(2)]
public sealed record PipelineTokenSaved(PipelineToken Token) : IStateChange
{
    public ApiaryState Apply(ApiaryState state) => state with { PipelineTokens = state.PipelineTokens.SetItem(Token.Id, Token) };
}
