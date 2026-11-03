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

    MaintenanceWindow? Maintenance { get; }
}
