using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.get", "Gets one HTTP route by its id: its project, hostname, path, targets and timeout.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record GetRoute([property: Description("The route's id.")] Guid Id) : IQuery<RouteView>;
