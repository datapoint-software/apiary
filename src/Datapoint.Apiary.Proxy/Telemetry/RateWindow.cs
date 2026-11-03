namespace Datapoint.Apiary.Proxy.Telemetry;

public sealed class RateWindow
{
    private const int Buckets = 6;
    private const long BucketSeconds = 10;
    private readonly long[] _counts = new long[Buckets];
    private readonly long[] _periods = new long[Buckets];
    private readonly Lock _reset = new();

    public void Add(long unixSeconds)
    {
        var period = unixSeconds / BucketSeconds;
        var slot = (int)(period % Buckets);
        if (Volatile.Read(ref _periods[slot]) != period)
        {
            lock (_reset)
            {
                if (_periods[slot] != period)
                {
                    Volatile.Write(ref _counts[slot], 0);
                    Volatile.Write(ref _periods[slot], period);
                }
            }
        }

        Interlocked.Increment(ref _counts[slot]);
    }

    public long PerMinute(long unixSeconds)
    {
        var current = unixSeconds / BucketSeconds;
        long sum = 0;
        for (var slot = 0; slot < Buckets; slot++)
        {
            if (current - Volatile.Read(ref _periods[slot]) < Buckets)
            {
                sum += Volatile.Read(ref _counts[slot]);
            }
        }

        return sum;
    }
}
