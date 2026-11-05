using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

public sealed class GetStackDetailsHandler(IClusterState cluster) : IQueryHandler<GetStackDetails, StackDetailsView>
{
    public ValueTask<StackDetailsView> HandleAsync(GetStackDetails query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        if (!state.Stacks.TryGetValue(query.Name, out var stack))
        {
            throw ActionFailedException.NotFound(ErrorCodes.StackNotFound);
        }

        IEnumerable<DeclaredItemView> routes = state.Routes.Values
            .Where(r => r.Stack?.Stack == stack.Name)
            .OrderBy(r => r.Host, StringComparer.Ordinal).ThenBy(r => r.Path, StringComparer.Ordinal)
            .Select(r => new DeclaredItemView(StackItemKind.Route, r.Id, StackPlanner.RouteName(r.Host, r.Path), r.Stack!.Service));
        var streams = state.StreamRoutes.Values
            .Where(s => s.Stack?.Stack == stack.Name)
            .OrderBy(s => s.ListenPort)
            .Select(s => new DeclaredItemView(StackItemKind.StreamRoute, s.Id, s.Name, s.Stack!.Service, s.Protocol, s.ListenPort));
        var redirects = state.Redirects.Values
            .Where(r => r.Stack?.Stack == stack.Name)
            .OrderBy(r => r.From, StringComparer.Ordinal)
            .Select(r => new DeclaredItemView(StackItemKind.Redirect, r.Id, r.From, r.Stack!.Service));
        var tokens = state.PipelineTokens.Values.Where(t => t.Stack == stack.Name).OrderBy(t => t.CreatedAt).Select(PipelineTokenView.Of);
        return new(new StackDetailsView(StackView.Of(state, stack), [.. routes.Concat(streams).Concat(redirects)], [.. tokens]));
    }
}
