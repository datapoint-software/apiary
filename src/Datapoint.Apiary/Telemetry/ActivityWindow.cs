using Datapoint.Apiary.Management.Activity;

namespace Datapoint.Apiary.Telemetry;

public sealed record ActivityWindow(long UntilMinute, int Points, int Step)
{
    public static ActivityWindow For(ActivityRange range, DateTimeOffset now) => range == ActivityRange.Hour
        ? Ending(now, 60, 1)
        : Ending(now, 96, 15);

    public DateTimeOffset Start(int point) =>
        DateTimeOffset.FromUnixTimeSeconds((UntilMinute - ((Points - point) * (long)Step) + 1) * 60);

    private static ActivityWindow Ending(DateTimeOffset now, int points, int step)
    {
        var minute = now.ToUnixTimeSeconds() / 60;
        return new(((minute / step) * step) + step - 1, points, step);
    }

    public string Query => FormattableString.Invariant($"until={UntilMinute}&points={Points}&step={Step}");
}
