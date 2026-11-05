using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Stacks;

[Action("stacks.remove", "Removes a stack after docker stack rm: deletes the routes, stream routes and redirects it declared, on every replica, and revokes its pipeline tokens.")]
[Api]
[RequiresRole(Role.Administrator)]
public sealed record RemoveStackAndRoutes([property: Description("The stack's name.")] string Name) : ICommand;
