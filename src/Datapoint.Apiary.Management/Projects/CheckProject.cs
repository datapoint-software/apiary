using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Projects;

[Action("projects.check", Description = "Checks whether a project name is free, for forms to warn as people type. Saving still checks everything.")]
[RequiresRole(Role.Operator)]
public sealed record CheckProject(
    [property: Description("The project name.")] string Name,
    [property: Description("The project being edited, which may keep its own name.")] Guid? Id = null)
    : IQuery<IReadOnlyList<FieldCheck>>;
