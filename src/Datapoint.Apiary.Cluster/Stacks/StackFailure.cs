namespace Datapoint.Apiary.Cluster.Stacks;

public sealed record StackFailure(DateTimeOffset At, string Code, string Token, string? Detail = null);
