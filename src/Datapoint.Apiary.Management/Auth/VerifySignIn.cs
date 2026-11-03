using System.ComponentModel;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Auth;

[Action("auth.verify", Description = "Finishes signing in with a code from the authenticator app or a recovery code. Returns new recovery codes when two-step sign-in was just set up.")]
[AllowAnonymousAccess]
public sealed record VerifySignIn(
    [property: Description("The challenge auth.signIn returned.")] string Challenge,
    [property: Description("A 6-digit code from the authenticator app, or a recovery code.")] string Code) : ICommand<SignInResult>;
