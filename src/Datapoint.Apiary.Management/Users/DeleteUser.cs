using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.delete", Description = "Deletes someone's account, or revokes their invite, and signs them out everywhere. The audit log keeps their actions.")]
[RequiresRole(Role.Administrator)]
public sealed record DeleteUser([property: Description("The user's id.")] Guid Id) : ICommand;
