using Datapoint.Apiary.Cluster.Stacks;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Management.Stacks;

public sealed record StackPlanResult(StackPlan Plan, IReadOnlyList<IStateChange> Changes, string? Conflict = null, IReadOnlyDictionary<string, object?>? ConflictParams = null)
{
    public static StackPlanResult Refused(string code, string name, object value) =>
        new(StackPlan.Empty, [], code, new Dictionary<string, object?>(StringComparer.Ordinal) { [name] = value });
}
