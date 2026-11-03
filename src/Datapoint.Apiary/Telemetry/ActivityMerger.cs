using Datapoint.Apiary.Management.Activity;
using Datapoint.Apiary.Proxy.Telemetry;

namespace Datapoint.Apiary.Telemetry;

public static class ActivityMerger
{
    private const double Quantile = 0.95;

    public static ActivityView Merge(ActivityWindow window, IEnumerable<IReadOnlyList<ActivitySample>> replicas)
    {
        var reports = replicas.Where(r => r.Count == window.Points).ToList();
        var points = new List<ActivityPoint>(window.Points);
        var total = new long[ActivityHistory.Boundaries.Count + 1];
        for (var point = 0; point < window.Points; point++)
        {
            var samples = reports.Select(r => r[point]).ToList();
            var latency = Sum(samples.Select(s => s.Latency));
            Add(total, latency);
            points.Add(new ActivityPoint(window.Start(point), samples.Sum(s => s.Requests), samples.Sum(s => s.Errors), Percentile(latency)));
        }

        return new ActivityView(window.Step, points, Percentile(total));
    }

    public static double? Percentile(IReadOnlyList<long> counts)
    {
        var total = counts.Sum();
        if (total == 0)
        {
            return null;
        }

        var target = total * Quantile;
        long seen = 0;
        var bounds = ActivityHistory.Boundaries;
        for (var slot = 0; slot < bounds.Count; slot++)
        {
            if (seen + counts[slot] >= target)
            {
                var lower = slot == 0 ? 0 : bounds[slot - 1];
                return lower + ((bounds[slot] - lower) * (target - seen) / counts[slot]);
            }

            seen += counts[slot];
        }

        return bounds[^1];
    }

    private static long[] Sum(IEnumerable<IReadOnlyList<long>> histograms)
    {
        var sum = new long[ActivityHistory.Boundaries.Count + 1];
        foreach (var histogram in histograms)
        {
            Add(sum, histogram);
        }

        return sum;
    }

    private static void Add(long[] sum, IReadOnlyList<long> histogram)
    {
        for (var slot = 0; slot < Math.Min(sum.Length, histogram.Count); slot++)
        {
            sum[slot] += histogram[slot];
        }
    }
}
