namespace Datapoint.Apiary.Telemetry;

public sealed class TelemetryOptions
{
    public Uri? OtlpEndpoint { get; set; }

    public bool Prometheus { get; set; } = true;
}
