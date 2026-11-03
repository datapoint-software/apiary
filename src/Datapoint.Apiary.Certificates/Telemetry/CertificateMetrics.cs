using System.Diagnostics.Metrics;
using Datapoint.Apiary.Cluster.State;

namespace Datapoint.Apiary.Certificates.Telemetry;

public sealed class CertificateMetrics
{
    public const string MeterName = "Datapoint.Apiary.Certificates";

    public CertificateMetrics(IMeterFactory meters, IClusterState cluster, TimeProvider time)
    {
        var meter = meters.Create(MeterName);
        meter.CreateObservableGauge(
            "apiary.certificates.expiry",
            () => Expiries(cluster.Current, time.GetUtcNow()),
            "d",
            "Days until each certificate expires. Negative once it has expired.");
        meter.CreateObservableGauge(
            "apiary.certificates.renewals.failing",
            () => cluster.Current.Certificates.Values.Count(c => c.FailedAttempts > 0),
            "{certificate}",
            "Certificates whose last attempt to issue or renew failed.");
    }

    private static IEnumerable<Measurement<double>> Expiries(ApiaryState state, DateTimeOffset now)
    {
        foreach (var certificate in state.Certificates.Values)
        {
            if (certificate.Material is { } material)
            {
                yield return new Measurement<double>(
                    Math.Round((material.NotAfter - now).TotalDays, 2),
                    new KeyValuePair<string, object?>("apiary.certificate.name", certificate.Name),
                    new KeyValuePair<string, object?>("apiary.certificate.source", certificate.Source.ToString().ToLowerInvariant()));
            }
        }
    }
}
