using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.update-defaults", "Sets the largest request HTTP routes accept unless they set their own. It changes every route that uses the default at once, on every replica; larger requests get a 413.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record UpdateRouteDefaults(
    [property: Description("The largest request, in megabytes (1 MB is 1,000,000 bytes), from 1 to 100000. The default is 30.")] int RequestMegabytes) : ICommand;
