using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Users;

[Action("users.create-admin", Description = "Creates an administrator and returns a one-time link, valid for 15 minutes. Only from the command line inside the container, for when every administrator is locked out.")]
[RequiresRole(Role.Administrator)]
public sealed record CreateAdministrator(
    [property: Description("Their name.")] string Name,
    [property: Description("Their email, used to sign in.")] string Email) : ICommand<InviteLink>;
