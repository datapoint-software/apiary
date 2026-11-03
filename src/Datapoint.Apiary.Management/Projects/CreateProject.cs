using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

[Action("projects.create", "Creates a project and returns its id. Projects group routes, redirects and certificates so they're easier to find; they don't change who can see or edit them.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record CreateProject(
    [property: Description("The project's name, at most 40 characters, unique regardless of case.")] string Name,
    [property: Description("A one-line description, at most 120 characters.")] string Description = "",
    [property: Description("The icon: folder, shopping-bag, credit-card, wrench, archive, megaphone, globe, server, database, cloud, boxes, flask-conical or heart-pulse.")] string Icon = ProjectIcons.Default)
    : ICommand<Guid>, IProjectFields;
