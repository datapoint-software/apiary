using System.Text.Json.Serialization;

namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record StackPlan(IReadOnlyList<StackPlanItem> Added, IReadOnlyList<StackPlanItem> Changed, IReadOnlyList<StackPlanItem> Removed)
{
    public static StackPlan Empty { get; } = new([], [], []);

    [JsonIgnore]
    public int Count => Added.Count + Changed.Count + Removed.Count;
}
