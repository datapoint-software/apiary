using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.change-password", Description = "Changes your password and signs out your other sessions. Returns how many were signed out.")]
[RequiresRole(Role.Viewer)]
public sealed record ChangePassword(
    [property: Description("Your current password.")] string Current,
    [property: Description("The new password.")] string Next) : ICommand<int>;
