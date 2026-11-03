using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.SingleSignOn;

[Action("auth.options", "Says which ways to sign in the sign-in page offers.")]
[Api]
[AllowAnonymousAccess]
public sealed record GetSignInOptions : IQuery<SignInOptions>;
