using System.ComponentModel;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.SingleSignOn;

[Action("auth.sso", "Finishes signing in through the identity provider. Apiary calls it itself after checking the provider's answer.")]
[Api]
[AllowAnonymousAccess]
public sealed record SignInWithSso(
    [property: Description("The identity Apiary checked, sealed so only Apiary can read it.")] string Assertion) : ICommand;
