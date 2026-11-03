using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.move", "Moves HTTP routes to another project. Only where they're listed changes: traffic isn't affected.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record MoveRoutes(
    [property: Description("The ids of the routes to move, at most 500.")] IReadOnlyList<Guid> Ids,
    [property: Description("The id of the project they move to.")] Guid ProjectId)
    : ICommand;
