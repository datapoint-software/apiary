using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record StackView(
    string Name,
    Guid? ProjectId,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    StackApply? LastApply,
    StackFailure? Failure,
    int Routes,
    int StreamRoutes,
    int Redirects)
{
    public static StackView Of(ApiaryState state, StackRecord stack) => new(
        stack.Name,
        stack.ProjectId,
        stack.CreatedAt,
        stack.CreatedBy,
        stack.LastApply,
        stack.Failure,
        state.Routes.Values.Count(r => r.Stack?.Stack == stack.Name),
        state.StreamRoutes.Values.Count(s => s.Stack?.Stack == stack.Name),
        state.Redirects.Values.Count(r => r.Stack?.Stack == stack.Name));
}
