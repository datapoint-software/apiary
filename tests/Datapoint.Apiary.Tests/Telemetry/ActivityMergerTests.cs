using Datapoint.Apiary.Proxy.Telemetry;
using Datapoint.Apiary.Telemetry;

namespace Datapoint.Apiary.Tests.Telemetry;

public sealed class ActivityMergerTests
{
    private const int OverflowSlot = 28;
    private const int Precision = 9;
    private static readonly ActivityWindow s_window = new(UntilMinute: 29_000_000, Points: 2, Step: 15);

    [Fact]
    public void Requests_and_errors_are_added_up_across_replicas_point_by_point()
    {
        IReadOnlyList<ActivitySample> first = [new(10, 1, Histogram(10)), new(20, 2, Histogram(20))];
        IReadOnlyList<ActivitySample> second = [new(5, 0, Histogram(5)), new(7, 3, Histogram(7))];

        var view = ActivityMerger.Merge(s_window, [first, second]);

        Assert.Equal([(15L, 1L), (27L, 5L)], view.Points.Select(p => (p.Requests, p.Errors)));
    }

    [Fact]
    public void Each_point_starts_at_its_place_in_the_window()
    {
        var view = ActivityMerger.Merge(s_window, []);

        Assert.Equal(15, view.MinutesPerPoint);
        Assert.Equal([s_window.Start(0), s_window.Start(1)], view.Points.Select(p => p.At));
        Assert.Equal(TimeSpan.FromMinutes(15), view.Points[1].At - view.Points[0].At);
    }

    [Fact]
    public void A_replica_that_reports_another_number_of_points_is_left_out()
    {
        IReadOnlyList<ActivitySample> matching = [new(10, 0, Histogram(10)), new(20, 0, Histogram(20))];
        IReadOnlyList<ActivitySample> other = [new(1000, 1000, Histogram(1000))];

        var view = ActivityMerger.Merge(s_window, [matching, other]);

        Assert.Equal([10L, 20L], view.Points.Select(p => p.Requests));
    }

    [Fact]
    public void Without_requests_there_is_no_response_time()
    {
        var view = ActivityMerger.Merge(s_window, [[new(0, 0, Histogram()), new(0, 0, Histogram())]]);

        Assert.Equal([null, null, null], [.. view.Points.Select(p => p.P95Milliseconds), view.P95Milliseconds]);
    }

    [Fact]
    public void The_response_time_is_merged_from_every_replica_s_histogram()
    {
        IReadOnlyList<ActivitySample> fast = [new(90, 0, Histogram(90)), new(0, 0, Histogram())];
        IReadOnlyList<ActivitySample> slower = [new(10, 0, Histogram(0, 10)), new(100, 0, InSlot(10, 100))];

        var view = ActivityMerger.Merge(s_window, [fast, slower]);

        Assert.Equal(1.5, view.Points[0].P95Milliseconds!.Value, Precision);
        Assert.Equal(98.75, view.Points[1].P95Milliseconds!.Value, Precision);
        Assert.Equal(97.5, view.P95Milliseconds!.Value, Precision);
    }

    [Fact]
    public void A_shorter_histogram_counts_the_slots_it_has()
    {
        IReadOnlyList<ActivitySample> samples = [new(1, 0, [0, 1]), new(0, 0, [])];

        var view = ActivityMerger.Merge(s_window, [samples]);

        Assert.Equal(1.95, view.Points[0].P95Milliseconds!.Value, Precision);
    }

    [Fact]
    public void The_percentile_falls_inside_the_bucket_that_holds_it()
    {
        Assert.Equal(0.95, ActivityMerger.Percentile(Histogram(100))!.Value, Precision);
    }

    [Fact]
    public void Response_times_beyond_the_last_bucket_report_its_bound()
    {
        Assert.Equal(ActivityHistory.Boundaries[^1], ActivityMerger.Percentile(InSlot(OverflowSlot, 3)));
    }

    [Fact]
    public void An_empty_histogram_has_no_percentile()
    {
        Assert.Null(ActivityMerger.Percentile(Histogram()));
    }

    private static long[] Histogram(params long[] leadingSlots)
    {
        var slots = new long[ActivityHistory.Boundaries.Count + 1];
        leadingSlots.CopyTo(slots, 0);
        return slots;
    }

    private static long[] InSlot(int slot, long count)
    {
        var slots = Histogram();
        slots[slot] = count;
        return slots;
    }
}
