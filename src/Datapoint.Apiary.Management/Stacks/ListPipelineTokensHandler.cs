using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class ListPipelineTokensHandler(IClusterState cluster) : IQueryHandler<ListPipelineTokens, IReadOnlyList<PipelineTokenView>>
{
    public ValueTask<IReadOnlyList<PipelineTokenView>> HandleAsync(ListPipelineTokens query, CancellationToken ct = default) =>
        new([.. cluster.Current.PipelineTokens.Values.OrderBy(t => t.Stack, StringComparer.Ordinal).ThenBy(t => t.CreatedAt).Select(PipelineTokenView.Of)]);
}
