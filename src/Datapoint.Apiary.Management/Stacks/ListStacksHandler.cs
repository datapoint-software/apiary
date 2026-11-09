using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class ListStacksHandler(IClusterState cluster) : IQueryHandler<ListStacks, IReadOnlyList<StackView>>
{
    public ValueTask<IReadOnlyList<StackView>> HandleAsync(ListStacks query, CancellationToken cancellationToken = default)
    {
        var state = cluster.Current;
        return new([.. state.Stacks.Values.OrderBy(s => s.Name, StringComparer.Ordinal).Select(s => StackView.Of(state, s))]);
    }
}
