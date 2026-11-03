using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

[Action("projects.delete", Description = "Deletes a project. A project that still has routes, redirects or uploaded certificates is only deleted when moveTo names another project: they move there first, in the same change, and keep working. The last project can't be deleted.")]
[RequiresRole(Role.Operator)]
public sealed record DeleteProject(
    [property: Description("The project's id.")] Guid Id,
    [property: Description("The id of the project its routes, redirects and uploaded certificates move to, or null if it's empty.")] Guid? MoveTo = null)
    : ICommand;
