using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.defaults", "Gets the defaults HTTP routes use unless they set their own: the largest request, in megabytes (1 MB is 1,000,000 bytes).")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Viewer)]
public sealed record GetRouteDefaults : IQuery<RouteDefaultsView>;
