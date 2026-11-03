using Datapoint.Apiary.Certificates.Telemetry;
using Datapoint.Apiary.Cluster.Telemetry;
using Datapoint.Apiary.Proxy.Telemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Datapoint.Apiary.Telemetry;

public static class TelemetrySetup
{
    private static readonly string[] s_meters =
    [
        ProxyMetrics.MeterName,
        ClusterMetrics.MeterName,
        CertificateMetrics.MeterName,
        "Datapoint.Mediator",
        "Microsoft.AspNetCore.Hosting",
        "Microsoft.AspNetCore.Server.Kestrel",
        "System.Net.Http",
        "System.Runtime",
    ];

    private static readonly string[] s_sources = ["Datapoint.Mediator", "Microsoft.AspNetCore", "Yarp.ReverseProxy", "System.Net.Http"];

    public static IServiceCollection AddApiaryTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.Get<TelemetryOptions>() ?? new TelemetryOptions();
        if (!options.Prometheus && options.OtlpEndpoint is null)
        {
            return services;
        }

        var telemetry = services.AddOpenTelemetry().ConfigureResource(r => r.AddService("apiary", serviceVersion: typeof(TelemetrySetup).Assembly.GetName().Version?.ToString()));
        telemetry.WithMetrics(metrics => Metrics(metrics, options));
        if (options.OtlpEndpoint is { } endpoint)
        {
            telemetry.WithTracing(tracing => tracing.AddSource(s_sources).AddOtlpExporter(o => o.Endpoint = endpoint));
        }

        return services;
    }

    public static void MapApiaryMetrics(this IEndpointRouteBuilder admin, IConfiguration configuration)
    {
        if (!(configuration.Get<TelemetryOptions>() ?? new TelemetryOptions()).Prometheus)
        {
            return;
        }

        admin.MapPrometheusScrapingEndpoint("/metrics");
    }

    public static void StartApiaryMeters(this IServiceProvider services)
    {
        services.GetRequiredService<ClusterMetrics>();
        services.GetRequiredService<CertificateMetrics>();
        services.GetRequiredService<ProxyMetrics>();
    }

    private static void Metrics(MeterProviderBuilder metrics, TelemetryOptions options)
    {
        metrics.AddMeter(s_meters);
        if (options.Prometheus)
        {
            metrics.AddPrometheusExporter();
        }

        if (options.OtlpEndpoint is not { } endpoint)
        {
            return;
        }

        metrics.AddOtlpExporter(o => o.Endpoint = endpoint);
    }
}
