namespace Datapoint.Apiary.Management.Activity;

public sealed record ActivityPoint(DateTimeOffset At, long Requests, long Errors, double? P95Milliseconds);
