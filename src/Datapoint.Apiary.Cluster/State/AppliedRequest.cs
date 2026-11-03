namespace Datapoint.Apiary.Cluster.State;

public sealed record AppliedRequest(DateTimeOffset At, string? Result);
