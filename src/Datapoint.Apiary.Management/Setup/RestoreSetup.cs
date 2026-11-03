using System.ComponentModel;
using Datapoint.Apiary.Management.Backups;
using Datapoint.Mediator;
using Datapoint.Mediator.Authorization;

namespace Datapoint.Apiary.Management.Setup;

[Action("setup.restore", "Restores a backup instead of creating the first administrator, e.g. to move from Docker Compose to Swarm. Works only while setup is open, and only with a backup made with the same root key.")]
[Api]
[AllowAnonymousAccess]
public sealed record RestoreSetup([property: Description("The backup file's content, as backups.export returned it.")] string Content) : ICommand<RestoredBackup>;
