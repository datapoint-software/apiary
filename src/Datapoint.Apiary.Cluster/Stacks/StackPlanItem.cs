namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record StackPlanItem(StackItemKind Kind, string Name)
{
    public string? Field { get; init; }

    public string? From { get; init; }

    public string? To { get; init; }

    public string? ReplacedBy { get; init; }

    public DateTimeOffset? ReplacedAt { get; init; }
}
