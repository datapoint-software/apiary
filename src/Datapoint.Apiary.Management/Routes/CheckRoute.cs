using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Apiary.Management.Validation;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.check", "Checks a route's hostname and path against the current routes and redirects, for forms to warn as people type. Saving still checks everything.")]
[Api]
[RequiresRole(Role.Operator)]
public sealed record CheckRoute(
    [property: Description("The hostname.")] string Host,
    [property: Description("The path.")] string Path,
    [property: Description("The route being edited, which may keep its own hostname and path.")] Guid? Id = null)
    : IQuery<IReadOnlyList<FieldCheck>>;
