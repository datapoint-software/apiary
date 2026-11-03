using System.ComponentModel;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Invites;

[Action("invites.get", "Returns the name and email an invite link is for, and starts setting up two-step sign-in.")]
[Api]
[AllowAnonymousAccess]
public sealed record GetInvite([property: Description("The token from the invite link.")] string Token) : IQuery<InviteView>;
