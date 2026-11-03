using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Account;

[Action("account.confirm-two-step", Description = "Finishes setting up two-step sign-in again with a code from the new authenticator app entry and your password. Recovery codes stay the same.")]
[RequiresRole(Role.Viewer)]
public sealed record ConfirmTwoStep(
    [property: Description("The challenge account.beginTwoStep returned.")] string Challenge,
    [property: Description("The 6-digit code from the authenticator app.")] string Code,
    [property: Description("Your password, to confirm it's you.")] string Password) : ICommand;
