namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record StackApply(DateTimeOffset At, string Token, string? Commit, string? PipelineUrl, StackPlan Plan);
