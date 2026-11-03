using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.enable", Description = "Lets a disabled account sign in again.")]
[RequiresRole(Role.Administrator)]
public sealed record EnableUser([property: Description("The user's id.")] Guid Id) : ICommand;
