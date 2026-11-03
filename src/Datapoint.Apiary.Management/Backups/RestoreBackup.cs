using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Backups;

[Action("backups.restore", Description = "Replaces the whole configuration with a backup's, on every replica, and signs everyone out. Changes made since the backup are lost. Traffic keeps flowing.")]
[RequiresRole(Role.Administrator)]
public sealed record RestoreBackup([property: Description("The backup file's content, as backups.export returned it.")] string Content) : ICommand<RestoredBackup>;
