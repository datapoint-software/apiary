using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.change-password", "Changes your password, signs out your other sessions and disconnects your agents. Returns how many of each.")]
[Api]
[RequiresRole(Role.Viewer)]
public sealed record ChangePassword(
    [property: Description("Your current password.")] string Current,
    [property: Description("The new password.")] string Next) : ICommand<ChangePasswordResult>;
