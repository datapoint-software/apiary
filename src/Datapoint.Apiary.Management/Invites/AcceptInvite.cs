using System.ComponentModel;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Invites;

[Action("invites.accept", Description = "Creates the account an invite link is for: sets its password and two-step sign-in, signs in and returns recovery codes.")]
[AllowAnonymousAccess]
public sealed record AcceptInvite(
    [property: Description("The token from the invite link.")] string Token,
    [property: Description("The new password.")] string Password,
    [property: Description("The challenge invites.get returned.")] string Challenge,
    [property: Description("The 6-digit code from the authenticator app.")] string Code) : ICommand<IReadOnlyList<string>>;
