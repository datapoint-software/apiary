using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Setup;

[Action("setup.status", Description = "Says whether first-access setup is open, and until when.")]
[AllowAnonymousAccess]
public sealed record GetSetupStatus : IQuery<SetupStatus>;
