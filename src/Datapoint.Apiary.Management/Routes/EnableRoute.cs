using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.enable", "Turns a disabled HTTP route back on, with its saved settings. Traffic flows again on every replica as soon as it's enabled.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record EnableRoute([property: Description("The route's id.")] Guid Id) : ICommand;
