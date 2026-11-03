namespace Datapoint.Apiary.Management.Projects;

public sealed record ProjectView(
    Guid Id,
    string Name,
    string Description,
    string Icon,
    int RouteCount,
    int RedirectCount,
    int CertificateCount,
    long RequestsPerMinute,
    int RoutesDown,
    int RoutesDegraded)
{
    public int StreamCount { get; init; }
}
