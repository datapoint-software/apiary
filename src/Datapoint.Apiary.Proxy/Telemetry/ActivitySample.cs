namespace Datapoint.Apiary.Proxy.Telemetry;

public sealed record ActivitySample(long Requests, long Errors, IReadOnlyList<long> Latency);
