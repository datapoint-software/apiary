using System.ComponentModel;
using Datapoint.Apiary.Management.Accounts;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Setup;

[Action("setup.begin", Description = "Checks the first administrator's details and starts setting up their two-step sign-in.")]
[AllowAnonymousAccess]
public sealed record BeginSetup(
    [property: Description("The administrator's name.")] string Name,
    [property: Description("The administrator's email, used to sign in.")] string Email,
    [property: Description("The administrator's password.")] string Password)
    : IQuery<TwoStepEnrollment>, ISetupFields;
