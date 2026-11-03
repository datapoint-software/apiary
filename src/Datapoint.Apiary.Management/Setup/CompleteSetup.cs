using System.ComponentModel;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Setup;

[Action("setup.complete", Description = "Creates the first administrator, signs them in and returns their recovery codes. Works only while setup is open.")]
[AllowAnonymousAccess]
public sealed record CompleteSetup(
    [property: Description("The administrator's name.")] string Name,
    [property: Description("The administrator's email, used to sign in.")] string Email,
    [property: Description("The administrator's password.")] string Password,
    [property: Description("The challenge setup.begin returned.")] string Challenge,
    [property: Description("The 6-digit code from the authenticator app.")] string Code)
    : ICommand<IReadOnlyList<string>>, ISetupFields;
