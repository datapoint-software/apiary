namespace Datapoint.Apiary.Management.Activity;

public sealed record ActivityView(int MinutesPerPoint, IReadOnlyList<ActivityPoint> Points, double? P95Milliseconds);
