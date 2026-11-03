using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.disable", "Turns an HTTP route off without deleting it. Visitors get a 503 page on every replica until it's enabled again; its settings and certificate are kept.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Operator)]
public sealed record DisableRoute([property: Description("The route's id.")] Guid Id) : ICommand;
