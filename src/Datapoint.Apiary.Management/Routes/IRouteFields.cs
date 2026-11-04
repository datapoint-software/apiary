using Datapoint.Apiary.Cluster.Routes;

namespace Datapoint.Apiary.Management.Routes;

public interface IRouteFields
{
    Guid ProjectId { get; }

    string Host { get; }

    string Path { get; }

    IReadOnlyList<RouteTarget> Targets { get; }

    int TimeoutSeconds { get; }

    Guid? CertificateId { get; }

    IReadOnlyList<string>? AllowedAddresses { get; }

    int? RateLimit { get; }

    MaintenanceWindow? Maintenance { get; }

    RouteCanary? Canary { get; }

    bool Sticky { get; }

    bool Compression { get; }

    bool Caching { get; }

    bool StrictTransport { get; }

    bool StrictTransportSubdomains { get; }

    RoutePasswordSettings? Password { get; }
}
