using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.update-profile", Description = "Changes your name and the email you sign in with.")]
[RequiresRole(Role.Viewer)]
public sealed record UpdateProfile(
    [property: Description("Your name.")] string Name,
    [property: Description("The email you sign in with.")] string Email) : ICommand;
