using System.ComponentModel;
using Datapoint.Apiary.Management.Transactions;
using Datapoint.Mediator.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Invites;

[Action("invites.accept", "Creates the account an invite link is for: sets its password and two-step sign-in, signs in and returns recovery codes.")]
[Api]
[AllowAnonymousAccess]
public sealed record AcceptInvite(
    [property: Description("The token from the invite link.")] string Token,
    [property: Description("The new password.")] string Password,
    [property: Description("The challenge invites.get returned.")] string Challenge,
    [property: Description("The 6-digit code from the authenticator app.")] string Code) : ICommand<IReadOnlyList<string>>, IConfidentialResult;
