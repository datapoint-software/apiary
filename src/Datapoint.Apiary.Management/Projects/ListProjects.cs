using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

[Action("projects.list", "Lists the projects, sorted by name: each project's id, name, description, icon, number of routes, redirects and uploaded certificates, requests per minute across replicas, and how many enabled routes are down or degraded.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record ListProjects : IQuery<IReadOnlyList<ProjectView>>;
