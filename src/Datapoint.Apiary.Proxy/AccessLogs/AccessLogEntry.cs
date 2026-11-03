namespace Datapoint.Apiary.Proxy.AccessLogs;

public sealed record AccessLogEntry(
    DateTimeOffset Time,
    string? ClientIp,
    string Method,
    string Host,
    string Path,
    int Status,
    long? Bytes,
    double DurationMs,
    string? Route,
    string? Target,
    string? UserAgent);
