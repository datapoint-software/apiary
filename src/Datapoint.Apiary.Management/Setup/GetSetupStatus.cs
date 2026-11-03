using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Setup;

[Action("setup.status", "Says whether first-access setup is open, and until when.")]
[Api]
[AllowAnonymousAccess]
public sealed record GetSetupStatus : IQuery<SetupStatus>;
