namespace Datapoint.Apiary.Proxy.Telemetry;

public sealed class ActivityHistory
{
    public const int Minutes = 24 * 60;
    private static readonly double[] s_boundaries =
        [1, 2, 5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 60000, 120000];

    private static readonly int s_slots = s_boundaries.Length + 1;
    private readonly long[] _minutes = new long[Minutes];
    private readonly long[] _requests = new long[Minutes];
    private readonly long[] _errors = new long[Minutes];
    private readonly long[] _latency = new long[Minutes * s_slots];
    private readonly Lock _reset = new();

    public static IReadOnlyList<double> Boundaries => s_boundaries;

    public void Add(long unixSeconds, int status, TimeSpan elapsed)
    {
        var minute = unixSeconds / 60;
        var index = (int)(minute % Minutes);
        if (Volatile.Read(ref _minutes[index]) != minute)
        {
            Clear(index, minute);
        }

        Interlocked.Increment(ref _requests[index]);
        if (status >= 500)
        {
            Interlocked.Increment(ref _errors[index]);
        }

        Interlocked.Increment(ref _latency[(index * s_slots) + Slot(elapsed.TotalMilliseconds)]);
    }

    public IReadOnlyList<ActivitySample> Read(long untilMinute, int points, int step)
    {
        var samples = new ActivitySample[points];
        for (var point = 0; point < points; point++)
        {
            var last = untilMinute - ((points - 1 - point) * (long)step);
            samples[point] = Sum(last - step + 1, last);
        }

        return samples;
    }

    private ActivitySample Sum(long first, long last)
    {
        long requests = 0;
        long errors = 0;
        var latency = new long[s_slots];
        for (var minute = Math.Max(first, last - Minutes + 1); minute <= last; minute++)
        {
            var index = (int)(minute % Minutes);
            if (Volatile.Read(ref _minutes[index]) != minute)
            {
                continue;
            }

            requests += Volatile.Read(ref _requests[index]);
            errors += Volatile.Read(ref _errors[index]);
            for (var slot = 0; slot < s_slots; slot++)
            {
                latency[slot] += Volatile.Read(ref _latency[(index * s_slots) + slot]);
            }
        }

        return new ActivitySample(requests, errors, latency);
    }

    private void Clear(int index, long minute)
    {
        lock (_reset)
        {
            if (_minutes[index] == minute)
            {
                return;
            }

            Volatile.Write(ref _requests[index], 0);
            Volatile.Write(ref _errors[index], 0);
            Array.Clear(_latency, index * s_slots, s_slots);
            Volatile.Write(ref _minutes[index], minute);
        }
    }

    private static int Slot(double milliseconds)
    {
        var slot = Array.BinarySearch(s_boundaries, milliseconds);
        return slot >= 0 ? slot : ~slot;
    }
}
