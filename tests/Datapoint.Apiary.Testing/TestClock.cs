using Microsoft.Extensions.Time.Testing;

namespace Datapoint.Apiary.Testing;

public static class TestClock
{
    public static readonly DateTimeOffset Now = new(2026, 11, 4, 12, 0, 0, TimeSpan.Zero);

    public static FakeTimeProvider Fake() => new(Now);
}
