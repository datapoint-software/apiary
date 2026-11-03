using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Datapoint.Apiary.Proxy.Telemetry;

public sealed class ProxyMetrics
{
    public const string MeterName = "Datapoint.Apiary.Proxy";
    private static readonly double[] s_durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 10, 30, 60, 120];
    private readonly ConcurrentDictionary<string, RateWindow> _rates = new(StringComparer.Ordinal);
    private readonly Counter<long> _requests;
    private readonly Histogram<double> _duration;
    private readonly TimeProvider _time;

    public ProxyMetrics(IMeterFactory meters, TimeProvider time)
    {
        _time = time;
        var meter = meters.Create(MeterName);
        _requests = meter.CreateCounter<long>("apiary.routes.requests", "{request}", "Requests answered for each route, by status code.");
        _duration = meter.CreateHistogram<double>(
            "apiary.routes.request.duration",
            "s",
            "How long each route took to answer, from the first byte received to the last byte sent.",
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_durationBuckets });
    }

    public ActivityHistory Activity { get; } = new();

    public void Record(string route, string host, int status, TimeSpan elapsed)
    {
        var now = _time.GetUtcNow().ToUnixTimeSeconds();
        _rates.GetOrAdd(route, static _ => new RateWindow()).Add(now);
        Activity.Add(now, status, elapsed);
        var tags = new TagList { { "apiary.route.id", route }, { "server.address", host } };
        _duration.Record(elapsed.TotalSeconds, tags);
        tags.Add("http.response.status_code", status);
        _requests.Add(1, tags);
    }

    public long PerMinute(string route) =>
        _rates.TryGetValue(route, out var window) ? window.PerMinute(_time.GetUtcNow().ToUnixTimeSeconds()) : 0;

    public void Forget(IReadOnlySet<string> keep)
    {
        foreach (var route in _rates.Keys)
        {
            if (!keep.Contains(route))
            {
                _rates.TryRemove(route, out _);
            }
        }
    }
}
