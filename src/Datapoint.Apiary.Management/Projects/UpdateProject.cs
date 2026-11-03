using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

[Action("projects.update", "Changes a project's name, description and icon.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record UpdateProject(
    [property: Description("The project's id.")] Guid Id,
    [property: Description("The project's name, at most 40 characters, unique regardless of case.")] string Name,
    [property: Description("A one-line description, at most 120 characters.")] string Description = "",
    [property: Description("The icon: folder, shopping-bag, credit-card, wrench, archive, megaphone, globe, server, database, cloud, boxes, flask-conical or heart-pulse.")] string Icon = ProjectIcons.Default)
    : ICommand, IProjectFields;
