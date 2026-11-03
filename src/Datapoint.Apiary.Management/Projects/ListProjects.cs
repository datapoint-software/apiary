using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

[Action("projects.list", Description = "Lists the projects, sorted by name: each project's id, name, description, icon, and number of routes, redirects and uploaded certificates.")]
[RequiresRole(Role.Viewer)]
public sealed record ListProjects : IQuery<IReadOnlyList<ProjectView>>;
