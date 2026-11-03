using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Backups;

[Action("backups.status", "Shows when the last backup was exported, by whom, and how many changes were made since.")]
[Api]
[ModelContextProtocol]
[RequiresRole(Role.Administrator)]
public sealed record GetBackupStatus : IQuery<BackupStatus>;
