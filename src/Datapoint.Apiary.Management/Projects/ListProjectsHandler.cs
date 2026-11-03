using Datapoint.Apiary.Cluster.Projects;
using Datapoint.Apiary.Cluster.Routes;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Routes;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

public sealed class ListProjectsHandler(IClusterState cluster, IRouteTelemetry telemetry) : IQueryHandler<ListProjects, IReadOnlyList<ProjectView>>
{
    public async ValueTask<IReadOnlyList<ProjectView>> HandleAsync(ListProjects query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var measured = await telemetry.ReadAsync(ct);
        var routes = state.Routes.Values.ToLookup(r => r.ProjectId);
        var redirects = state.Redirects.Values.CountBy(r => r.ProjectId).ToDictionary();
        var certificates = state.Certificates.Values.Where(c => c.ProjectId is not null).CountBy(c => c.ProjectId!.Value).ToDictionary();
        return [.. state.Projects.Values
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .Select(p => View(p, [.. routes[p.Id]], redirects.GetValueOrDefault(p.Id), certificates.GetValueOrDefault(p.Id), measured))];
    }

    private static ProjectView View(Project project, IReadOnlyList<Route> routes, int redirects, int certificates, IReadOnlyDictionary<Guid, RouteTelemetry> measured)
    {
        var active = routes.Where(r => !r.Disabled).Select(r => measured.GetValueOrDefault(r.Id, RouteTelemetry.Unknown)).ToList();
        return new ProjectView(
            project.Id,
            project.Name,
            project.Description,
            project.Icon,
            routes.Count,
            redirects,
            certificates,
            active.Sum(t => t.RequestsPerMinute),
            active.Count(t => t.Health == RouteHealth.Down),
            active.Count(t => t.Health == RouteHealth.Degraded));
    }
}
