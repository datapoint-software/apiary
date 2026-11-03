using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Routes;

[Action("routes.delete", Description = "Deletes an HTTP route. Requests to its hostname and path get a 404 on every replica as soon as it's deleted.")]
[RequiresRole(Role.Operator)]
public sealed record DeleteRoute([property: Description("The route's id.")] Guid Id) : ICommand;
