using System.ComponentModel;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Auth;

[Action("auth.sign-in", "Checks an email and password, and returns the next step: a code from the authenticator app, or setting one up.")]
[Api]
[AllowAnonymousAccess]
public sealed record SignIn(
    [property: Description("The email the account signs in with.")] string Email,
    [property: Description("The account's password.")] string Password) : IQuery<SignInStep>;
