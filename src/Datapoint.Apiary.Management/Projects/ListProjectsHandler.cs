using Datapoint.Apiary.Cluster.State;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

public sealed class ListProjectsHandler(IClusterState cluster) : IQueryHandler<ListProjects, IReadOnlyList<ProjectView>>
{
    public ValueTask<IReadOnlyList<ProjectView>> HandleAsync(ListProjects query, CancellationToken ct = default)
    {
        var state = cluster.Current;
        var routes = state.Routes.Values.CountBy(r => r.ProjectId).ToDictionary();
        var redirects = state.Redirects.Values.CountBy(r => r.ProjectId).ToDictionary();
        var certificates = state.Certificates.Values.Where(c => c.ProjectId is not null).CountBy(c => c.ProjectId!.Value).ToDictionary();
        IReadOnlyList<ProjectView> projects = [.. state.Projects.Values
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .Select(p => new ProjectView(p.Id, p.Name, p.Description, p.Icon, routes.GetValueOrDefault(p.Id), redirects.GetValueOrDefault(p.Id), certificates.GetValueOrDefault(p.Id)))];
        return new(projects);
    }
}
